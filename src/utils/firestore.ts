import * as admin from 'firebase-admin'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config()

if (!process.env.SERVICE_ACCOUNT_PATH) {
	throw new Error('SERVICE_ACCOUNT_PATH environment variable is not set')
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
	const serviceAccountPath = path.join(__dirname, process.env.SERVICE_ACCOUNT_PATH!)
	initializeApp({
		credential: admin.credential.cert(serviceAccountPath)
	})
}

const db = getFirestore()

interface BatchWriteOptions {
	batchSize?: number
	onBatchComplete?: (size: number) => void
}

/**
 * Generic function to push items to a Firestore collection
 * @param collectionId - The ID of the collection to write to
 * @param items - Array of items to write
 * @param documentIdFn - Function to determine the document ID for each item
 * @param transformFn - Function to transform the item before writing to Firestore
 * @param options - Additional options for batch writing
 */
export async function pushToFirestore<T>(
	collectionId: string,
	items: T[],
	documentIdFn: (item: T) => string,
	transformFn: (item: T) => Record<string, any>,
	options: BatchWriteOptions = {}
): Promise<void> {
	try {
		const { batchSize = 500, onBatchComplete } = options
		let batch = db.batch()
		let count = 0

		for (const item of items) {
			const docId = documentIdFn(item)
			const data = transformFn(item)
			const docRef = db.collection(collectionId).doc(docId)
			batch.set(docRef, data)

			count++

			if (count === batchSize) {
				await batch.commit()
				onBatchComplete?.(count)
				batch = db.batch()
				count = 0
			}
		}

		// Commit any remaining items
		if (count > 0) {
			await batch.commit()
			onBatchComplete?.(count)
		}
	} catch (error) {
		console.error(`Error pushing items to Firestore collection ${collectionId}:`, error)
		throw error
	}
}

/**
 * Closes the Firebase Admin SDK connection
 */
export async function closeFirebaseConnection(): Promise<void> {
	await admin.app().delete()
}
