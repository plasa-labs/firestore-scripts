import * as path from 'path'
import * as fs from 'fs/promises'

interface WriteJsonsOptions {
	getFileName: (item: any) => string
	batchSize?: number
	onBatchComplete?: (count: number, total: number) => void
}

/**
 * Generic function to write JSON items to individual files in a specified folder
 * @param folderName - Name of the folder within the data directory
 * @param items - Array of items to write as JSON files
 * @param options - Configuration options for writing files
 */
export async function writeJsonsToFolder<T>(
	folderName: string,
	items: T[],
	options: WriteJsonsOptions
): Promise<void> {
	const {
		getFileName,
		batchSize = 100,
		onBatchComplete
	} = options

	const outputDir = path.join(process.cwd(), 'data', folderName)

	try {
		// Create output directory if it doesn't exist
		await fs.mkdir(outputDir, { recursive: true })

		let savedCount = 0
		for (const item of items) {
			const fileName = getFileName(item)
			const filePath = path.join(outputDir, fileName + '.json')

			await fs.writeFile(filePath, JSON.stringify(item, null, 2), 'utf-8')

			savedCount++
			if (savedCount % batchSize === 0) {
				onBatchComplete?.(savedCount, items.length)
			}
		}

		// Call onBatchComplete one final time if there are remaining items
		if (savedCount % batchSize !== 0) {
			onBatchComplete?.(savedCount, items.length)
		}

		console.log('Files saved successfully!')
		console.log(`Total items saved: ${savedCount}`)
		console.log(`Output directory: ${outputDir}`)
	} catch (error) {
		console.error('Error saving files:', error)
		throw error
	}
}
