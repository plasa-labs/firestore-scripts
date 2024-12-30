import * as dotenv from 'dotenv'
import { getPayments } from './api'
import { MercadoPagoPayment } from '../types/payment'

dotenv.config()

if (!process.env.MP_FETCH_START_DATE) {
	throw new Error('MP_FETCH_START_DATE environment variable is not set')
}

export async function fetchAllPayments(): Promise<MercadoPagoPayment[]> {
	const allPayments: MercadoPagoPayment[] = []
	let hasMorePayments = true
	let offset = 0
	const limit = 100 // MercadoPago's max limit per request

	try {
		while (hasMorePayments) {
			console.log(`Fetching payments batch with offset: ${offset}`)

			const response = await getPayments({
				begin_date: new Date(process.env.MP_FETCH_START_DATE!).toISOString(),
				end_date: new Date().toISOString(),
				range: 'date_created',
				offset,
				limit
			})

			const { results, paging } = response

			if (results.length === 0) {
				hasMorePayments = false
				break
			}

			allPayments.push(...results)
			console.log(`Fetched ${results.length} payments. Total so far: ${allPayments.length}`)

			// Check if we've reached the end of available payments
			if (offset + limit >= paging.total) {
				hasMorePayments = false
				break
			}

			offset += limit

			// Add a small delay to avoid rate limiting
			await new Promise((resolve) => setTimeout(resolve, 100))
		}

		console.log(`Finished fetching all payments. Total: ${allPayments.length}`)
		return allPayments

	} catch (error) {
		console.error('Error fetching all payments:', error)
		throw error
	}
}
