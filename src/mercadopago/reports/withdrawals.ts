import * as dotenv from 'dotenv'
import { writeJsonsToFolder } from '../../utils/fs/write-jsons'
import { readCsvFile } from '../../utils/fs/read-csv'

dotenv.config()

if (!process.env.MP_USER_ID) {
	throw new Error('MP_USER_ID environment variable is not set')
}

if (!process.env.MP_REPORT_FILE_NAME) {
	throw new Error('MP_REPORT_FILE_NAME environment variable is not set')
}

interface MPReportTransaction {
	[key: string]: string
	EXTERNAL_REFERENCE: string
	SOURCE_ID: string
	USER_ID: string
	PAYMENT_METHOD_TYPE: string
	PAYMENT_METHOD: string
	SITE: string
	TRANSACTION_TYPE: string
	TRANSACTION_AMOUNT: string
	TRANSACTION_CURRENCY: string
	SELLER_AMOUNT: string
	TRANSACTION_DATE: string
	FEE_AMOUNT: string
	SETTLEMENT_NET_AMOUNT: string
	SETTLEMENT_CURRENCY: string
	SETTLEMENT_DATE: string
	REAL_AMOUNT: string
	COUPON_AMOUNT: string
	METADATA: string
	KMP_FEE_AMOUNT: string
	FINANCING_FEE_AMOUNT: string
	SHIPPING_FEE_AMOUNT: string
	TAXES_AMOUNT: string
	INSTALLMENTS: string
	TAX_DETAIL: string
	POS_ID: string
	STORE_ID: string
	STORE_NAME: string
	EXTERNAL_POS_ID: string
	POS_NAME: string
	EXTERNAL_STORE_ID: string
	ORDER_ID: string
	SHIPPING_ID: string
	SHIPMENT_MODE: string
	PACK_ID: string
	POI_ID: string
}

interface MPWithdrawal {
	captured: boolean
	charges_details: Array<{
		amounts: {
			original: number
			refunded: number
		}
		name: string
		type: string
	}>
	currency_id: string
	date_approved: string
	date_created: string
	date_last_updated: string
	description: string
	id: number
	live_mode: boolean
	money_release_date: string
	money_release_status: string
	operation_type: string
	payer_id: string
	payment_type_id: string
	refunds: any[]
	status: string
	status_detail: string
	taxes_amount: number
	transaction_amount: number
	transaction_amount_refunded: number
	transaction_details: {
		installment_amount: number
		net_received_amount: number
		overpaid_amount: number
		total_paid_amount: number
	}
}

const MP_REPORT_HEADERS = [
	'EXTERNAL_REFERENCE',
	'SOURCE_ID',
	'USER_ID',
	'PAYMENT_METHOD_TYPE',
	'PAYMENT_METHOD',
	'SITE',
	'TRANSACTION_TYPE',
	'TRANSACTION_AMOUNT',
	'TRANSACTION_CURRENCY',
	'SELLER_AMOUNT',
	'TRANSACTION_DATE',
	'FEE_AMOUNT',
	'SETTLEMENT_NET_AMOUNT',
	'SETTLEMENT_CURRENCY',
	'SETTLEMENT_DATE',
	'REAL_AMOUNT',
	'COUPON_AMOUNT',
	'METADATA',
	'KMP_FEE_AMOUNT',
	'FINANCING_FEE_AMOUNT',
	'SHIPPING_FEE_AMOUNT',
	'TAXES_AMOUNT',
	'INSTALLMENTS',
	'TAX_DETAIL',
	'POS_ID',
	'STORE_ID',
	'STORE_NAME',
	'EXTERNAL_POS_ID',
	'POS_NAME',
	'EXTERNAL_STORE_ID',
	'ORDER_ID',
	'SHIPPING_ID',
	'SHIPMENT_MODE',
	'PACK_ID',
	'POI_ID'
]

async function extractWithdrawals(): Promise<void> {
	const inputFolder = `mp-reports-${process.env.MP_USER_ID}`
	const outputFolder = `mp-withdrawals-${process.env.MP_USER_ID}`
	const fileName = process.env.MP_REPORT_FILE_NAME!

	try {
		console.log('Starting to extract withdrawals from MercadoPago report...')

		const { data: records } = await readCsvFile<MPReportTransaction>(inputFolder, fileName, {
			skipFirstRow: true,
			parseNumber: false,
			delimiter: ',',
			headers: MP_REPORT_HEADERS
		})

		console.log(`Found ${records.length} total records in ${fileName}`)

		const withdrawals = records.filter((record: MPReportTransaction) => {
			return (
				record.TRANSACTION_TYPE === 'PAYOUTS'
			)
		})

		console.log(`Found ${withdrawals.length} withdrawals in ${fileName}`)

		const processedWithdrawals = withdrawals.map(w => ({
			captured: true,
			charges_details: [{
				amounts: {
					original: Math.abs(parseFloat(w.TAXES_AMOUNT)),
					refunded: 0
				},
				name: w.TAX_DETAIL === 'tax_debitos_creditos'
					? 'tax_withholding_collector-debitos_creditos'
					: w.TAX_DETAIL,
				type: "tax"
			}],
			currency_id: w.TRANSACTION_CURRENCY,
			date_approved: w.SETTLEMENT_DATE,
			date_created: w.TRANSACTION_DATE,
			date_last_updated: w.SETTLEMENT_DATE,
			description: "Transferencia",
			// fee_details: [
			// 	{
			// 		amount: Math.abs(transaction.FEE_AMOUNT),
			// 		fee_payer: "collector",
			// 		type: "mercadopago_fee"
			// 	}
			// ],
			id: parseInt(w.SOURCE_ID),
			live_mode: true,
			money_release_date: w.SETTLEMENT_DATE,
			money_release_status: "released",
			operation_type: "regular_payment",
			payer_id: w.USER_ID,
			payment_type_id: "account_money",
			refunds: [],
			status: "approved",
			status_detail: "accredited",
			taxes_amount: Math.abs(parseFloat(w.TAXES_AMOUNT)),
			transaction_amount: Math.abs(parseFloat(w.TRANSACTION_AMOUNT)),
			transaction_amount_refunded: 0,
			transaction_details: {
				installment_amount: Math.abs(parseFloat(w.INSTALLMENTS || '0')),
				net_received_amount: Math.abs(parseFloat(w.TRANSACTION_AMOUNT)),
				overpaid_amount: 0,
				total_paid_amount: Math.abs(parseFloat(w.REAL_AMOUNT))
			}
		}))

		await writeJsonsToFolder<MPWithdrawal>(
			outputFolder,
			processedWithdrawals,
			{
				getFileName: (withdrawal) => withdrawal.id.toString(),
				batchSize: 100,
				onBatchComplete: (count, total) => {
					console.log(`Processed ${count} of ${total} withdrawals (${((count / total) * 100).toFixed(2)}%)`)
				}
			}
		)

		console.log('Successfully completed extracting withdrawals!')
		console.log(`Total withdrawals processed: ${processedWithdrawals.length}`)

	} catch (error) {
		console.error('Error extracting withdrawals:', error)
		throw error
	}
}

void extractWithdrawals()
	.catch(error => {
		console.error('Script failed:', error)
		process.exit(1)
	})
