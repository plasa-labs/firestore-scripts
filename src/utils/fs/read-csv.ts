import * as path from 'path'
import * as fs from 'fs/promises'
import csv from 'csv-parser'
import { Readable } from 'stream'

interface ReadCsvOptions {
	skipFirstRow?: boolean
	parseNumber?: boolean
	delimiter?: string
	headers?: string[]
}

export async function readCsvFile<T>(
	folderName: string,
	fileName: string,
	options: ReadCsvOptions = {}
): Promise<{ data: T[] }> {
	const {
		skipFirstRow = false,
		parseNumber = true,
		delimiter = ',',
		headers
	} = options

	const folderPath = path.join(process.cwd(), 'data', folderName)
	const filePath = path.join(folderPath, fileName + '.csv')

	try {
		const fileContent = await fs.readFile(filePath, 'utf-8')

		// Remove any BOM characters and clean the content
		const cleanContent = fileContent.replace(/^\uFEFF/, '')

		return new Promise((resolve, reject) => {
			const results: T[] = []
			let isFirstRow = true

			Readable.from(cleanContent)
				.pipe(csv({
					separator: delimiter,
					headers: headers,
					skipLines: skipFirstRow ? 1 : 0
				}))
				.on('data', (row) => {
					if (isFirstRow && skipFirstRow) {
						isFirstRow = false
						return
					}

					// Clean and parse numeric values if needed
					if (parseNumber) {
						Object.keys(row).forEach(key => {
							if (!isNaN(row[key]) && row[key] !== '') {
								row[key] = parseFloat(row[key])
							}
						})
					}

					results.push(row as T)
				})
				.on('end', () => {
					resolve({ data: results })
				})
				.on('error', reject)
		})
	} catch (error) {
		console.error('Error reading CSV file:', error)
		throw error
	}
}
