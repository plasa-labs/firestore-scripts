import * as dotenv from 'dotenv'
import { readJsonsInFolder } from '../utils/fs/read-jsons'
import { writeJsonsToFolder } from '../utils/fs/write-jsons'
import { MercadoPagoPayment, CleanedPayment, ChargeDetail, PointOfInteraction } from '../utils/types/payment'

dotenv.config()

// Validate required environment variables
if (!process.env.MP_USER_ID) {
	throw new Error('MP_USER_ID environment variable is not set')
}

if (!process.env.MP_MIN_PAYMENT_ID) {
	throw new Error('MP_MIN_PAYMENT_ID environment variable is not set')
}

const minPaymentId = Number(process.env.MP_MIN_PAYMENT_ID)

async function cleanMercadoPagoPayments(): Promise<void> {
	const inputFolder = `mp-payments-${process.env.MP_USER_ID}-raw`
	const outputFolder = `mp-payments-${process.env.MP_USER_ID}`

	try {
		console.log('Starting to clean MercadoPago payments...')

		// Read all payment files
		const results = await readJsonsInFolder<MercadoPagoPayment>(inputFolder)

		// Filter payments based on minimum ID
		const validPayments = results
			.filter(result => {
				const payment = result.data as MercadoPagoPayment
				return payment.id >= minPaymentId
			})
			.map(result => result.data as MercadoPagoPayment)

		console.log(`Found ${validPayments.length} payments to process`)

		// Clean and transform payments
		const cleanedPayments: CleanedPayment[] = validPayments.map(payment => ({
			captured: payment.captured as boolean,
			charges_details: (payment.charges_details as ChargeDetail[]).map(charge => ({
				amounts: {
					original: charge.amounts.original,
					refunded: charge.amounts.refunded
				},
				name: charge.name,
				type: charge.type
			})),
			collector_id: payment.collector_id!,
			currency_id: payment.currency_id!,
			date_approved: payment.date_approved!,
			date_created: payment.date_created,
			date_last_updated: payment.date_last_updated!,
			description: payment.description!,
			fee_details: payment.fee_details as Array<{ amount: number, fee_payer: string, type: string }>,
			id: payment.id,
			live_mode: payment.live_mode as boolean,
			money_release_date: payment.money_release_date!,
			money_release_status: payment.money_release_status as string,
			operation_type: payment.operation_type as string,
			payment_type_id: payment.payment_type_id!,
			point_of_interaction: {
				business_info: {
					branch: (payment.point_of_interaction as PointOfInteraction).business_info.branch,
					sub_unit: (payment.point_of_interaction as PointOfInteraction).business_info.sub_unit,
					unit: (payment.point_of_interaction as PointOfInteraction).business_info.unit
				},
				type: (payment.point_of_interaction as PointOfInteraction).type
			},
			refunds: payment.refunds as Array<unknown>,
			status: payment.status,
			status_detail: payment.status_detail!,
			taxes_amount: payment.taxes_amount as number,
			transaction_amount: payment.transaction_amount!,
			transaction_amount_refunded: payment.transaction_amount_refunded!,
			transaction_details: {
				...payment.transaction_details!,
				installment_amount: payment.transaction_details!.installment_amount ?? 0,
				net_received_amount: payment.transaction_details!.net_received_amount ?? 0,
				total_paid_amount: payment.transaction_details!.total_paid_amount ?? 0,
				overpaid_amount: payment.transaction_details!.overpaid_amount ?? 0,
			}
		}))

		// Save cleaned payments
		await writeJsonsToFolder<CleanedPayment>(
			outputFolder,
			cleanedPayments,
			{
				getFileName: (payment) => payment.id.toString(),
				batchSize: 100,
				onBatchComplete: (count, total) => {
					console.log(`Cleaned ${count} of ${total} payment files (${((count / total) * 100).toFixed(2)}%)`)
				}
			}
		)

		console.log('Successfully completed cleaning payments!')
		console.log(`Total payments processed: ${cleanedPayments.length}`)

	} catch (error) {
		console.error('Error cleaning payments:', error)
		throw error
	}
}

// Execute the function
void cleanMercadoPagoPayments()
	.catch(error => {
		console.error('Script failed:', error)
		process.exit(1)
	})
