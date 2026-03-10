// Налаштування шаблону
import templateConfig from '../template.config.js'
const finalAliases = templateConfig.aliases
// Логгер
import logger from './logger.js'

import { normalizePath } from 'vite'
import * as esbuild from 'esbuild'
import { Glob, globSync } from 'glob'
import fs from 'fs'

const isProduction = process.env.NODE_ENV === 'production'
const isWp = process.argv.includes('--wp')

export const scriptsPlugins = [
	// Обробка псевдонімів в JS-файлах
	{
		name: 'do-aliases',
		order: "pre",
		transform(html, file) {
			if (file.endsWith(".js")) {
				Object.keys(finalAliases).forEach((alias) => {
					if (html.includes(alias)) {
						finalAliases[alias] = finalAliases[alias].replace(new RegExp(`src`, "g"), ``)
						html = html.replace(new RegExp(alias, "g"), finalAliases[alias])
					}
				})
			}
			return html
		},
	},
	// Чистка від модуля FLS
	...((isProduction && templateConfig.logger.console.removeonbuild) ? [{
		name: 'fls-clean',
		apply: 'build',
		enforce: 'post',
		transform(src, id) {
			if (id.endsWith('.js')) {
				return src.replace(/(?<!function\s)FLS\(.*?\);?/gi, '')
			}
		}
	}] : []),
	// Створення копії файлу(лів) для розробніків
	...((isProduction && templateConfig.js.devfiles) ? [{
		name: "js-devfiles",
		apply: 'build',
		enforce: 'post',
		writeBundle: {
			order: 'post',
			handler: async ({ dir }) => {
				const jsFiles = globSync(`${dir}/js/*.js`)
				// Створення копій
				!fs.existsSync(`${dir}/js/dev`) ? fs.mkdirSync(`${dir}/js/dev`) : null
				jsFiles.forEach(async (jsFile) => {
					jsFile = normalizePath(jsFile)
					const devJsFile = jsFile.replace('.min', '').replace('/js/', '/js/dev/')
					fs.copyFileSync(jsFile, devJsFile)
				});
				logger('_IMG_JS_DEV_DONE')
				// Оптимізація файлів
				await esbuild.build({
					entryPoints: jsFiles,
					allowOverwrite: true,
					minify: true,
					outdir: `${dir}/js`,
				})
			}
		}
	}] : []),
	// Динамічне додавання JS-модулів
	...(templateConfig.js.hotmodules ? [{
		name: 'hot-modules',
		transformIndexHtml: {
			order: 'pre',
			handler(html) {
				return insertModule(html)
			}
		},
	}] : []),
]
async function insertModule(html) {
	const modules = new Set()
	const moduleJSFiles = new Glob(`src/components/**/*.js`, { ignore: ['**/_*.*', '**/plugins/**', '**/pages/**', '**/wordpress/**'] })
	const modulePlugins = new Map()
	for (let moduleJSFile of moduleJSFiles) {
		moduleJSFile = normalizePath(moduleJSFile).replace('src', '')
		const moduleName = moduleJSFile.split('/').pop().replace('.js', '')
		const pluginFiles = globSync(`src/components/*/${moduleName}/plugins/**/*.js`)
		modulePlugins.set(moduleName, pluginFiles.map(plugin => normalizePath(plugin).replace('src', '')))

	}
	for (let moduleJSFile of moduleJSFiles) {
		moduleJSFile = normalizePath(moduleJSFile).replace('src', '')
		const moduleName = moduleJSFile.split('/').pop().replace('.js', '')
		const regex = new RegExp(`\\bdata-fls-${moduleName}\\b`)
		if (regex.test(html)) {
			modules.add(`<script type="module" src="${moduleJSFile}"></script>`)
			// Перевіряємо, чи є плагіни для цього модуля
			const curentModulePlugins = modulePlugins.get(moduleName)
			if (curentModulePlugins) {
				curentModulePlugins.forEach(curentModulePlugin => {
					const pluginName = curentModulePlugin.split('/').pop().replace('.js', '')
					const pluginRegex = new RegExp(`\\bdata-fls-${moduleName}-${pluginName}\\b`)
					if (pluginRegex.test(html)) {
						modules.add(`<script type="module" src="${curentModulePlugin}"></script>`)
					}
				})
			}
		}
	}
	return html.replace('</head>', `${Array.from(modules).join('')}</head>`)
}