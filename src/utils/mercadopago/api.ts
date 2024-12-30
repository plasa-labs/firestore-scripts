import axios from 'axios'
import * as dotenv from 'dotenv'

dotenv.config()

interface PaymentsParams {
	begin_date?: string
	end_date?: string
	range?: string
	offset?: number
	limit?: number
}

if (!process.env.MP_ACCESS_TOKEN) {
	throw new Error('MP_ACCESS_TOKEN environment variable is not set')
}

const api = axios.create({
	baseURL: 'https://api.mercadopago.com/v1',
	headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
})

export async function getPayment(paymentId: string) {
	const response = await api.get(`/payments/${paymentId}`)
	return response.data
}

export async function getPayments(params: PaymentsParams) {
	const response = await api.get('/payments/search', { params })
	return response.data
}
