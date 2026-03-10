import path from 'node:path'
import { outlineSvg } from '@davestewart/outliner'
import { optimize } from 'svgo'
import { readFile, writeFile } from 'fs/promises';

// Оптимізація SVG-іконок
export async function svgOptimaze(iconsFiles) {
	// Оптимізація SVG іконок
	// Convert SVG strokes to paths and optimize SVG
	const convertAndOptimizeSvg = async (file, srcDir, distDir) => {
		const filePath = path.join(srcDir, file)
		const outputFilePath = path.join(distDir, file)
		try {
			let svgContent = await readFile(filePath, 'utf8')
			const outlinedSvg = outlineSvg(svgContent)
			const optimizedSvg = optimize(outlinedSvg, {
				path: outputFilePath,
				plugins: getSvgOptimizationPlugins(),
			})
			await writeFile(outputFilePath, optimizedSvg.data, 'utf8')
		} catch (error) {
			console.error(`Error processing file ${file}:`, error)
		}
	}
	// SVG optimization plugins
	const getSvgOptimizationPlugins = () => [
		{ name: 'removeXMLProcInst', active: true },
		{
			name: 'removeAttrs',
			params: { attrs: '(stroke|style|fill|clip-path|id|data-name)' },
		},
		{ name: 'removeUselessDefs', active: true },
		{ name: 'removeEmptyContainers', active: true },
		/*{
			name: 'addAttributesToSVGElement',
			params: { attributes: [{ fill: 'black' }] },
		},*/
		{ name: 'convertStyleToAttrs', active: true },
		{ name: 'convertPathData', active: true },
	]
	iconsFiles.map((file) => convertAndOptimizeSvg(file, '', ''))
}