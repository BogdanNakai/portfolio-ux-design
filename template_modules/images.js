// Налаштування шаблону
import templateConfig from '../template.config.js'
// Логгер
import logger from './logger.js'
// SVG-спрайт
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'
// Робота с зображеннями
import sharp from 'sharp';
import { imageSize } from 'image-size'

import { normalizePath } from 'vite'
import { globSync } from 'glob'
import fs from 'fs'
import { cp } from 'fs/promises'

import { svgOptimaze } from './svgoptimaze.js'

const iconsFiles = globSync('src/assets/svgicons/*.svg')
const isProduction = process.env.NODE_ENV === 'production'
const isWp = process.argv.includes('--wp')

let copyIgnore = new Set()

export const imagePlugins = [
	// SVG-спрайт
	...((templateConfig.images.svgsprite) ? [svgOptimaze(iconsFiles)] : []),
	...((templateConfig.images.svgsprite) ? [
		VitePluginSvgSpritemap('assets/svgicons/*.svg', {
			prefix: 'sprite-',
			route: '__spritemap',
			output: {
				use: true,
				view: true,
				filename: 'img/[name][extname]',
				name: 'spritemap.svg'
			},
			injectSvgOnDev: true,
			svgo: {
				plugins: [
					{
						name: 'removeStyleElement',
					},
				],
			},
			styles: {
				lang: 'scss',
				filename: 'styles/includes/spritemap.scss',
				include: ['mixin', 'variables'],
				names: {
					prefix: 'sprites-prefix',
					sprites: 'sprites',
					mixin: 'sprite',
				}
			}
			// idify: (name, svg) => `sprite-${name}`,
		})] : []),
	// Робота с зображеннями
	...((isProduction && !isWp) ? [{
		name: "images",
		apply: 'build',
		enforce: 'pre',
		writeBundle: {
			order: 'pre',
			handler: ({ dir }) => {
				!fs.existsSync(`dist/assets`) ? fs.mkdirSync('dist/assets') : null
				!fs.existsSync('dist/assets/img') ? fs.mkdirSync('dist/assets/img') : null
				if (templateConfig.images.optimize.enable) {
					const uniqImages = new Set();
					const files = globSync([`${dir}/*.html`, `${dir}/js/*.js`, `${dir}/css/*.css`])
					for (const file of files) {
						let content = fs.readFileSync(file, 'utf-8')
						if (file.endsWith('.html') || file.endsWith('.js')) {
							const attrIgnore = templateConfig.images.optimize.attrignore
							// Обробка зображень які вказані в src тегів IMG
							content = content.replace(new RegExp(`<img(?![^>]*\\s${attrIgnore})[^>]*>`, 'gi'), (data) => {
								const regex = /(\w+)\s*=\s*"([^"]*)"/g
								let match, imagePath, sizesAttr
								let attributes = ``
								while ((match = regex.exec(data)) !== null) {
									const [key, value] = [match[1], match[2]]
									if (key === 'sizes') {
										sizesAttr = value
									} else if (key === 'src') {
										imagePath = value
									} else {
										attributes += `${key}="${value}" `
									}
								}
								if (!imagePath) return data;
								sizesAttr = sizesAttr ? sizesAttr.split(',') : templateConfig.images.optimize.sizes
								const dpi = templateConfig.images.optimize.dpi

								imagePath = imagePath.startsWith('./') ? imagePath.replace('./', '/') : imagePath
								const fullImagePath = `src${imagePath}`;

								if (fs.existsSync(fullImagePath)) {
									const extType = imagePath.split('.').pop().toLowerCase();
									if (/^(png|webp|avif|jpe?g|gif|tiff|bmp|ico)$/i.test(extType)) {
										uniqImages.add(imagePath)
										const newHtmlCode = imageResizeInit(fullImagePath, sizesAttr, dpi, extType, attributes, file.endsWith('.html') ? 'html' : 'js')
										return templateConfig.images.optimize.edithtml ? newHtmlCode : data;
									}
								}
								return data;
							})
							// Обробка зображень які вказані в href тегів A
							content = content.replace(/<a\s[^>]*href=["']([^"']+\.(jpg|jpeg|avif|png|gif|webp))["'][^>]*>/gi, (data, url) => {
								return returnUrl(data, url, uniqImages)
							})
						} else if (file.endsWith('.css')) {
							// Обробка зображень які вказані в url CSS-файлів
							content = content.replace(/url\(['"]?(https?:\/\/[^\s'"]+\.(?:jpg|jpeg|png|gif)|[^\s'"]+\.(?:jpg|jpeg|png|gif))['"]?\)/gi, (data, url) => {
								return returnUrl(data, url, uniqImages)
							})
						}
						fs.writeFileSync(file, content, 'utf-8');
					}
					const counter = Array.from(uniqImages).length
					counter > 0 ? logger(`_IMG_DONE`, counter) : null
				}
				copyOtherImages(copyIgnore)
			}
		}
	}] : []),
]
// Побудова HTML-структури
function imageResizeInit(image, sizes, dpi, extType, attr, mode = 'html') {
	const reg = new RegExp('\\.(png|webp|avif|jpeg|jpg|gif)(?=\\s|\\)|"|\'|$)', "gi")
	const isWebpAvif = /avif|webp/i.test(extType)
	const imageoutExt = isWebpAvif || !templateConfig.images.optimize.modernformat.enable ? extType : templateConfig.images.optimize.modernformat.type
	const imageout = image.replace('src/', `dist/`)
	const isNeedPicture = sizes.length || (!isWebpAvif && templateConfig.images.optimize.modernformat.enable && !templateConfig.images.optimize.modernformat.only)
	const imageOutUrl = isWebpAvif || !templateConfig.images.optimize.modernformat.enable ? imageout : imageout.replace(reg, `.${templateConfig.images.optimize.modernformat.type}`)
	let templete = ``
	if (mode === 'html' || mode === 'js') {
		isNeedPicture ? templete = `<picture>` : null
		for (const size of sizes) {
			const imageoutSize = imageout.replace(reg, `-${size}.${imageoutExt}`)
			const dpiSizesImages = dpi.length ? getDpi(+size, dpi, image, imageoutSize, extType, imageoutExt) : null
			templete += `<source media="(max-width: ${size}px)" srcset="${dpiSizesImages ? dpiSizesImages : imageResize(+size, image, imageoutSize, extType)}" type="image/${imageoutExt}">`
		}

		const dpiImages = dpi.length ? getDpi(null, dpi, image, imageOutUrl, extType, imageoutExt) : null

		if (templateConfig.images.optimize.modernformat.only || isWebpAvif) {
			templete += `<img ${attr} src="${imageResize(null, image, imageOutUrl, extType)}" ${dpiImages ? `srcset="${dpiImages}"` : ``}>`
		} else {
			!isWebpAvif ? templete += `<source srcset="${dpiImages ? dpiImages : imageResize(null, image, imageOutUrl, extType)}" type="image/${imageoutExt}">` : null
			templete += `<img ${attr} src="${imageout.replace('dist/', templateConfig.server.path)}">`
		}
		isNeedPicture ? templete += `</picture>` : null

	} else {
		templete += `${imageResize([], image, imageOutUrl, extType)}`
	}
	imageDelete(image, isWebpAvif)
	return templete
}
// Конвертація та зміна розмірів зображень
function imageResize(size, image, imageout, extType) {
	// Працюємо з типами зображень
	if (templateConfig.images.optimize.modernformat.enable && templateConfig.images.optimize.modernformat.type === 'webp') {
		sharp(image, { animated: true }).resize(size).webp({ quality: templateConfig.images.optimize.modernformat.quality || 80 }).toFile(imageout, (err) => { err ? console.error(err) : null })
	} else if (templateConfig.images.optimize.modernformat.enable && templateConfig.images.optimize.modernformat.type === 'avif') {
		sharp(image, { animated: true }).resize(size).avif({ quality: templateConfig.images.optimize.modernformat.quality || 80 }).toFile(imageout, (err) => { err ? console.error(err) : null })
	} else if (/png/i.test(extType)) {
		sharp(image, { animated: true }).resize(size).png({ quality: templateConfig.images.optimize.png.quality || 80 }).toFile(imageout, (err) => { err ? console.error(err) : null })
	} else if (/jpe?g/i.test(extType)) {
		sharp(image, { animated: true }).resize(size).jpeg({ quality: templateConfig.images.optimize.jpeg.quality || 80 }).toFile(imageout, (err) => { err ? console.error(err) : null })
	} else {
		sharp(image, { animated: true }).resize(size).toFile(imageout, (err) => { err ? console.error(err) : null })
	}
	!size ? copyIgnore.add(imageout.replace('dist', '')) : null
	return imageout.replace('dist/', templateConfig.server.path)
}
// Повернення шляху
function returnUrl(data, url, uniqImages) {
	let inset
	if (url.startsWith('../')) {
		url = url.replace('../', '')
		inset = true
	}
	if (fs.existsSync(`src/${url}`)) {
		uniqImages.add(url)
		const imageLine = imageResizeInit(`src/${url}`, [], [], url.split('.').pop(), null, 'url').replace('//', '/')
		return data.replace(url, inset ? imageLine.replace('./', '') : imageLine)
	} else {
		return data
	}
}
// Видалення зайвих файлів
function imageDelete(image, isWebpAvif) {
	image = image.replace('src/', 'dist/')
	if (templateConfig.images.optimize.modernformat.enable && templateConfig.images.optimize.modernformat.only) {
		copyIgnore.add(image.replace('dist', ''))
		!isWebpAvif && fs.existsSync(image) ? fs.unlinkSync(image) : null
	}
}
// Копіювання папки img
async function copyOtherImages(copyIgnore) {
	copyIgnore = Array.from(copyIgnore)
	try {
		cp('src/assets/img', 'dist/assets/img', {
			recursive: true,
			force: false,
			preserveTimestamps: true,
			filter: (file) => {
				file = normalizePath(file)
				for (const item of copyIgnore) {
					if (file.includes(item)) {
						return false
					}
				}
				return true
			}
		});
	} catch (error) {
		logger(`_IMG_COPY_ERR`, error);
	}
}
function getDpi(size, dpi, image, imageOutUrl, extType, imageoutExt) {
	const dpiImages = []
	dpiImages.push(`${imageResize(size, image, imageOutUrl, extType)} 1x`)
	const imageSize = size ? size : getImgSize(image).width
	for (const dpiItem of dpi) {
		const dpiSize = dpiItem * imageSize
		const newImageOutUrl = imageOutUrl.replace(`.${imageoutExt}`, `-${dpiItem}x.${imageoutExt}`)
		dpiImages.push(`${imageResize(dpiSize, image, newImageOutUrl, extType)} ${dpiItem}x`)
	}
	return dpiImages.join()
}
function getImgSize(image) {
	const buffer = fs.readFileSync(image)
	return imageSize(buffer)
}

