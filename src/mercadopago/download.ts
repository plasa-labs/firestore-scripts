import * as dotenv from 'dotenv'
import { fetchAllPayments } from './payments'
import { writeJsonsToFolder } from '../utils/fs/write-jsons'
import { MercadoPagoPayment } from '../utils/types/payment'

dotenv.config()

// Validate required environment variables
if (!process.env.MP_USER_ID) {
	throw new Error('MP_USER_ID environment variable is not set')
}

async function downloadAndSavePayments(): Promise<void> {
	try {
		console.log('Starting to fetch payments from MercadoPago...')

		// Fetch all payments
		const payments = await fetchAllPayments()

		// Define folder name using the user ID
		const folderName = `mp-payments-${process.env.MP_USER_ID}-raw`

		console.log(`Saving ${payments.length} payments to folder: ${folderName}`)

		// Save payments using the writeJsonsToFolder utility
		await writeJsonsToFolder<MercadoPagoPayment>(
			folderName,
			payments,
			{
				getFileName: (payment) => payment.id.toString(),
				batchSize: 100,
				onBatchComplete: (count, total) => {
					console.log(`Saved ${count} of ${total} payment files (${((count / total) * 100).toFixed(2)}%)`)
				}
			}
		)

		console.log('Successfully completed downloading and saving payments!')
		console.log(`Total payments processed: ${payments.length}`)

	} catch (error) {
		console.error('Error downloading and saving payments:', error)
		throw error
	}
}

// Execute the function
void downloadAndSavePayments()
	.catch(error => {
		console.error('Script failed:', error)
		process.exit(1)
	})
