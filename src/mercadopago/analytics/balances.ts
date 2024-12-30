import * as dotenv from 'dotenv'
import { readJsonsInFolder } from '../../utils/fs/read-jsons'
import { writeJsonsToFolder } from '../../utils/fs/write-jsons'
import { CleanedPayment } from '../../utils/types/payment'

dotenv.config()

if (!process.env.MP_USER_ID) {
	throw new Error('MP_USER_ID environment variable is not set')
}

interface BalanceStats {
	totalTransactions: number
	totalAmount: number
	netAmount: number
	totalFees: number

	approved: {
		count: number
		amount: number
		net: number
	}
	pending: {
		count: number
		amount: number
	}
	rejected: {
		count: number
		amount: number
	}
	refunded: {
		count: number
		amount: number
	}

	released: {
		count: number
		amount: number
	}
	pending_release: {
		count: number
		amount: number
	}

	feeTypes: {
		[key: string]: {
			count: number
			amount: number
		}
	}

	monthlyStats: {
		[key: string]: {
			count: number
			amount: number
			net: number
			fees: number
		}
	}
}

function initializeStats(): BalanceStats {
	return {
		totalTransactions: 0,
		totalAmount: 0,
		netAmount: 0,
		totalFees: 0,

		approved: { count: 0, amount: 0, net: 0 },
		pending: { count: 0, amount: 0 },
		rejected: { count: 0, amount: 0 },
		refunded: { count: 0, amount: 0 },

		released: { count: 0, amount: 0 },
		pending_release: { count: 0, amount: 0 },

		feeTypes: {},
		monthlyStats: {}
	}
}

function processPayment(payment: CleanedPayment, stats: BalanceStats): void {
	stats.totalTransactions++
	stats.totalAmount += payment.transaction_amount
	stats.netAmount += payment.transaction_details.net_received_amount

	// Process fees
	let totalFees = 0
	payment.fee_details?.forEach(fee => {
		totalFees += fee.amount
		if (!stats.feeTypes[fee.type]) {
			stats.feeTypes[fee.type] = { count: 0, amount: 0 }
		}
		stats.feeTypes[fee.type].count++
		stats.feeTypes[fee.type].amount += fee.amount
	})
	stats.totalFees += totalFees

	// Process by status
	switch (payment.status) {
		case 'approved':
			stats.approved.count++
			stats.approved.amount += payment.transaction_amount
			stats.approved.net += payment.transaction_details.net_received_amount
			break
		case 'pending':
			stats.pending.count++
			stats.pending.amount += payment.transaction_amount
			break
		case 'rejected':
			stats.rejected.count++
			stats.rejected.amount += payment.transaction_amount
			break
	}

	// Process refunds
	if (payment.transaction_amount_refunded > 0) {
		stats.refunded.count++
		stats.refunded.amount += payment.transaction_amount_refunded
	}

	// Process money release status
	if (payment.money_release_status === 'released') {
		stats.released.count++
		stats.released.amount += payment.transaction_details.net_received_amount
	} else if (payment.status === 'approved') {
		stats.pending_release.count++
		stats.pending_release.amount += payment.transaction_details.net_received_amount
	}

	// Process monthly stats
	const monthYear = payment.date_created.substring(0, 7) // Format: YYYY-MM
	if (!stats.monthlyStats[monthYear]) {
		stats.monthlyStats[monthYear] = {
			count: 0,
			amount: 0,
			net: 0,
			fees: 0
		}
	}

	const monthStats = stats.monthlyStats[monthYear]
	monthStats.count++
	monthStats.amount += payment.transaction_amount
	monthStats.net += payment.transaction_details.net_received_amount
	monthStats.fees += totalFees
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS'
	}).format(amount)
}

function printStats(stats: BalanceStats): void {
	console.log('\n=== Payment Processing Statistics ===')
	console.log(`Total Transactions: ${stats.totalTransactions}`)
	console.log(`Total Amount: ${formatCurrency(stats.totalAmount)}`)
	console.log(`Net Amount: ${formatCurrency(stats.netAmount)}`)
	console.log(`Total Fees: ${formatCurrency(stats.totalFees)}`)

	console.log('\n=== Status Breakdown ===')
	console.log(`Approved: ${stats.approved.count} (${formatCurrency(stats.approved.amount)})`)
	console.log(`Pending: ${stats.pending.count} (${formatCurrency(stats.pending.amount)})`)
	console.log(`Rejected: ${stats.rejected.count} (${formatCurrency(stats.rejected.amount)})`)
	console.log(`Refunded: ${stats.refunded.count} (${formatCurrency(stats.refunded.amount)})`)

	console.log('\n=== Money Release Status ===')
	console.log(`Released: ${stats.released.count} (${formatCurrency(stats.released.amount)})`)
	console.log(`Pending Release: ${stats.pending_release.count} (${formatCurrency(stats.pending_release.amount)})`)

	console.log('\n=== Fee Breakdown ===')
	Object.entries(stats.feeTypes).forEach(([type, data]) => {
		console.log(`${type}: ${data.count} occurrences (${formatCurrency(data.amount)})`)
	})

	console.log('\n=== Monthly Statistics ===')
	Object.entries(stats.monthlyStats)
		.sort((a, b) => a[0].localeCompare(b[0]))
		.forEach(([month, data]) => {
			console.log(`\n${month}:`)
			console.log(`  Transactions: ${data.count}`)
			console.log(`  Gross Amount: ${formatCurrency(data.amount)}`)
			console.log(`  Net Amount: ${formatCurrency(data.net)}`)
			console.log(`  Fees: ${formatCurrency(data.fees)}`)
			console.log(`  Average Transaction: ${formatCurrency(data.amount / data.count)}`)
		})
}

async function analyzePayments(): Promise<void> {
	const inputFolder = `mp-payments-${process.env.MP_USER_ID}`
	const outputFolder = `mp-payments-${process.env.MP_USER_ID}-analytics`
	const stats = initializeStats()

	try {
		console.log('Starting to analyze MercadoPago payments...')

		const results = await readJsonsInFolder<CleanedPayment>(inputFolder)
		console.log(`Found ${results.length} payment files to process`)

		for (const result of results) {
			processPayment(result.data, stats)
		}

		// Save the stats to a JSON file
		await writeJsonsToFolder(
			outputFolder,
			[stats],
			{
				getFileName: () => 'balance-stats',
				onBatchComplete: () => {
					console.log('Balance stats saved successfully')
				}
			}
		)

		printStats(stats)
		console.log('\nAnalysis completed successfully!')

	} catch (error) {
		console.error('Error analyzing payments:', error)
		throw error
	}
}

// Execute the function
void analyzePayments()
	.catch(error => {
		console.error('Script failed:', error)
		process.exit(1)
	})
