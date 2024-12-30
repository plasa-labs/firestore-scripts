import * as dotenv from 'dotenv'
import { CleanedPayment } from '../../utils/types/payment'
import { readJsonsInFolder } from '../../utils/fs/read-jsons'
import { writeCSV } from '../../utils/fs/write-csv'

dotenv.config()

if (!process.env.MP_USER_ID) {
	throw new Error('MP_USER_ID environment variable is not set')
}

interface DailyStats {
	date: string
	totalPayments: number
	approvedPayments: number
	rejectedPayments: number
	pendingPayments: number
	grossAmount: number
	netAmount: number
	refundedAmount: number
	feesAmount: number
	taxesAmount: number
	averageTransactionAmount: number
	creditCardPayments: number
	debitCardPayments: number
	otherPaymentMethods: number
}

const initializeDailyStats = (date: string): DailyStats => ({
	date,
	totalPayments: 0,
	approvedPayments: 0,
	rejectedPayments: 0,
	pendingPayments: 0,
	grossAmount: 0,
	netAmount: 0,
	refundedAmount: 0,
	feesAmount: 0,
	taxesAmount: 0,
	averageTransactionAmount: 0,
	creditCardPayments: 0,
	debitCardPayments: 0,
	otherPaymentMethods: 0
})

async function analyzePayments(): Promise<void> {
	console.log('\n=== Starting Payment Analysis ===')

	const collectionId = `mp-payments-${process.env.MP_USER_ID}`
	const dailyStats: { [key: string]: DailyStats } = {}

	try {
		const results = await readJsonsInFolder<CleanedPayment>(collectionId)
		console.log(`Found ${results.length} payment files to process`)

		// Process each payment
		for (const result of results) {
			const payment = result.data
			const date = payment.date_created.split('T')[0]

			if (!dailyStats[date]) {
				dailyStats[date] = initializeDailyStats(date)
			}

			const stats = dailyStats[date]
			stats.totalPayments++

			// Status counts
			if (payment.status === 'approved') stats.approvedPayments++
			else if (payment.status === 'rejected') stats.rejectedPayments++
			else stats.pendingPayments++

			// Amount calculations
			stats.grossAmount += payment.transaction_amount
			stats.netAmount += payment.transaction_details.net_received_amount
			stats.refundedAmount += payment.transaction_amount_refunded
			stats.taxesAmount += payment.taxes_amount

			// Calculate fees
			const totalFees = payment.fee_details.reduce((sum: number, fee: any) => sum + fee.amount, 0)
			stats.feesAmount += totalFees

			// Payment method counts
			if (payment.payment_type_id === 'credit_card') stats.creditCardPayments++
			else if (payment.payment_type_id === 'debit_card') stats.debitCardPayments++
			else stats.otherPaymentMethods++
		}

		// Calculate averages and fill missing dates
		const dates = Object.keys(dailyStats).sort()
		const startDate = new Date(dates[0])
		const endDate = new Date(dates[dates.length - 1])

		for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
			const dateStr = d.toISOString().split('T')[0]
			if (!dailyStats[dateStr]) {
				dailyStats[dateStr] = initializeDailyStats(dateStr)
			}

			// Calculate average transaction amount
			const stats = dailyStats[dateStr]
			stats.averageTransactionAmount = stats.totalPayments > 0
				? stats.grossAmount / stats.totalPayments
				: 0
		}

		// Write results to CSV
		const headers = [
			'date',
			'totalPayments',
			'approvedPayments',
			'rejectedPayments',
			'pendingPayments',
			'grossAmount',
			'netAmount',
			'refundedAmount',
			'feesAmount',
			'taxesAmount',
			'averageTransactionAmount',
			'creditCardPayments',
			'debitCardPayments',
			'otherPaymentMethods'
		]

		const sortedStats = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date))

		await writeCSV(`mp-payments-${process.env.MP_USER_ID}-analytics`, 'daily.csv', sortedStats, {
			headers,
			getRowData: (stats) => [
				stats.date,
				stats.totalPayments,
				stats.approvedPayments,
				stats.rejectedPayments,
				stats.pendingPayments,
				stats.grossAmount,
				stats.netAmount,
				stats.refundedAmount,
				stats.feesAmount,
				stats.taxesAmount,
				stats.averageTransactionAmount,
				stats.creditCardPayments,
				stats.debitCardPayments,
				stats.otherPaymentMethods
			]
		})

		// Print summary
		console.log('\n=== Analysis Summary ===')
		console.log(`Total days analyzed: ${sortedStats.length}`)
		console.log(`Output file: mp-daily-analytics.csv`)
		console.log('=== Analysis Complete ===\n')

	} catch (error) {
		console.error('Error analyzing payments:', error)
		throw error
	}
}

// Execute the analysis
void analyzePayments()
	.catch(error => {
		console.error('Script failed:', error)
		process.exit(1)
	})
