import * as fs from 'fs/promises'
import * as path from 'path'

interface CSVWriteOptions {
	headers: string[]
	getRowData: (item: any) => (string | number)[]
	formatNumber?: (value: number) => string
}

/**
 * Generic function to write data to a CSV file
 * @param fileName - Name of the CSV file to create
 * @param items - Array of items to write to CSV
 * @param options - Configuration options for CSV writing
 */
export async function writeCSV<T>(
	folderName: string,
	fileName: string,
	items: T[],
	options: CSVWriteOptions
): Promise<void> {
	const {
		headers,
		getRowData,
		formatNumber = (value: number) => value.toFixed(2)
	} = options

	const outputPath = path.join(process.cwd(), 'data', folderName, fileName)

	try {
		// Write headers
		const headerRow = headers.join(',') + '\n'
		await fs.writeFile(outputPath, headerRow)

		// Write data rows
		for (const item of items) {
			const rowData = getRowData(item).map(value => {
				if (typeof value === 'number') {
					return formatNumber(value)
				}
				return value
			})
			const row = rowData.join(',') + '\n'
			await fs.appendFile(outputPath, row)
		}

		console.log(`CSV file successfully written to: ${outputPath}`)
	} catch (error) {
		console.error('Error writing CSV file:', error)
		throw error
	}
}
