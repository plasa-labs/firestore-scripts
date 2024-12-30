import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs/promises'
import { pushToFirestore, closeFirebaseConnection } from '../../utils/firestore'

dotenv.config()

// Environment variable checks

if (!process.env.INSTAGRAM_ACCOUNT_TO_PUSH) {
	throw new Error('INSTAGRAM_ACCOUNT_TO_PUSH environment variable is not set')
}

const collectionId = `followers-instagram-${process.env.INSTAGRAM_ACCOUNT_TO_PUSH}`

interface InstagramFollower {
	string_list_data: Array<{
		value: string
		timestamp: number
	}>
}

// Statistics tracking
let grandTotalFollowers = 0

async function processFollowersFile(filePath: string): Promise<{ added: number }> {
	try {
		const jsonData = await fs.readFile(filePath, 'utf8')
		const followers: InstagramFollower[] = JSON.parse(jsonData)
		console.log(`Processing ${followers.length} followers from ${path.basename(filePath)}`)

		await pushToFirestore(
			collectionId,
			followers,
			(follower) => '@' + follower.string_list_data[0].value,
			(follower) => ({
				username: follower.string_list_data[0].value,
				timestamp: follower.string_list_data[0].timestamp,
				real: true
			}),
			{
				batchSize: 500,
				onBatchComplete: (size) => {
					console.log(`Batch of ${size} followers committed from ${path.basename(filePath)}`)
				}
			}
		)

		console.log(
			`File Summary: ${path.basename(filePath)}\n` +
			`  Total followers added: ${followers.length}\n` +
			`  Total processed: ${followers.length}`
		)

		return { added: followers.length }
	} catch (error) {
		console.error(`Error processing ${path.basename(filePath)}:`, error)
		return { added: 0 }
	}
}

async function processAllFollowerFiles(): Promise<void> {
	const folderPath = path.join(process.cwd(), 'data', collectionId)
	console.log(`Starting to process follower files from: ${folderPath}`)

	try {
		await fs.access(folderPath)

		const files = await fs.readdir(folderPath)
		const jsonFiles = files.filter(file =>
			file.startsWith('followers_') && file.endsWith('.json')
		)

		console.log(`Found ${jsonFiles.length} follower files to process.`)

		for (const file of jsonFiles) {
			const filePath = path.join(folderPath, file)
			console.log(`Processing file: ${file}`)
			const { added } = await processFollowersFile(filePath)
			grandTotalFollowers += added
		}

		console.log(
			`Grand Total Summary:\n` +
			`  Total followers added: ${grandTotalFollowers}\n` +
			`  Total followers processed: ${grandTotalFollowers}`
		)
	} catch (error) {
		console.error('Error processing follower files:', error)
		throw error
	}
}

void processAllFollowerFiles()
	.then(() => {
		console.log('Script execution completed. Cleaning up...')
		return closeFirebaseConnection()
	})
	.catch(error => {
		console.error('Script failed:', error)
		process.exit(1)
	})
