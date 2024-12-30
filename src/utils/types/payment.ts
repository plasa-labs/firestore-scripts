interface PayerIdentification {
	type: string | null
	number: number | null
}

interface Payer {
	id: number | null
	email: string | null
	identification: PayerIdentification | null
	type: string | null
}

interface TransactionDetails {
	net_received_amount: number | null
	total_paid_amount: number | null
	overpaid_amount: number | null
	installment_amount: number | null
}

export interface MercadoPagoPayment {
	id: number
	date_created: string
	date_approved: string | null
	date_last_updated: string | null
	money_release_date: string | null
	payment_method_id: string | null
	payment_type_id: string | null
	status: string
	status_detail: string | null
	currency_id: string | null
	description: string | null
	collector_id: number | null
	payer: Payer | null
	metadata: Record<string, unknown>
	additional_info: Record<string, unknown>
	external_reference?: string | null
	transaction_amount: number | null
	transaction_amount_refunded: number | null
	coupon_amount: number | null
	transaction_details: TransactionDetails | null
	installments: number | null
	card: Record<string, unknown> | null
	[key: string]: unknown
}