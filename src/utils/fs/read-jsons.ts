import * as path from 'path'
import * as fs from 'fs/promises'

export interface JsonFileProcessingResult<T> {
	data: T
	fileName: string
}

export async function readJsonsInFolder<T>(
	folderName: string
): Promise<JsonFileProcessingResult<T>[]> {
	const folderPath = path.join(process.cwd(), 'data', folderName)
	try {
		await fs.access(folderPath)

		const files = await fs.readdir(folderPath)
		const jsonFiles = files

		const results: JsonFileProcessingResult<T>[] = []

		for (const file of jsonFiles) {
			const filePath = path.join(folderPath, file)
			const jsonData = await fs.readFile(filePath, 'utf8')
			results.push({
				data: JSON.parse(jsonData) as T,
				fileName: file
			})
		}

		return results
	} catch (error) {
		console.error('Error reading JSON files:', error)
		throw error
	}
}
