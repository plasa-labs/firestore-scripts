import * as dotenv from 'dotenv'
import { pushToFirestore, closeFirebaseConnection } from '../utils/firestore'
import { readJsonsInFolder } from '../utils/fs/read-jsons'
import { CleanedPayment } from '../utils/types/payment'

dotenv.config()

// Validate required environment variables
if (!process.env.MP_USER_ID) {
	throw new Error('MP_USER_ID environment variable is not set')
}

const collectionId = `mp-payments-${process.env.MP_USER_ID}`

async function pushPaymentsToFirestore(): Promise<void> {
	console.log(`Starting to push payments to collection: ${collectionId}`)

	try {
		// Read all payment files from the cleaned data folder
		const results = await readJsonsInFolder<CleanedPayment>(`mp-payments-${process.env.MP_USER_ID}`)
		const payments = results.map(result => result.data)

		console.log(`Found ${payments.length} payments to process`)

		// Push payments to Firestore
		await pushToFirestore(
			collectionId,
			payments,
			(payment) => payment.id.toString(),
			(payment) => ({
				...payment,
				imported_at: new Date().toISOString()
			}),
			{
				batchSize: 500,
				onBatchComplete: (size) => {
					console.log(`Batch of ${size} payments committed`)
				}
			}
		)

		console.log('Successfully completed pushing payments to Firestore!')
		console.log(`Total payments processed: ${payments.length}`)

	} catch (error) {
		console.error('Error pushing payments:', error)
		throw error
	}
}

// Execute the function
void pushPaymentsToFirestore()
	.then(() => {
		console.log('Script execution completed. Cleaning up...')
		return closeFirebaseConnection()
	})
	.catch(error => {
		console.error('Script failed:', error)
		process.exit(1)
	})
