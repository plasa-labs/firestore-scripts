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

export interface ChargeDetail {
	amounts: {
		original: number
		refunded: number
	}
	name: string
	type: string
}

export interface PointOfInteraction {
	business_info: {
		branch: string
		sub_unit: string
		unit: string
	}
	type: string
}

export interface CleanedPayment {
	captured: boolean
	charges_details: Array<ChargeDetail>
	collector_id: number
	currency_id: string
	date_approved: string
	date_created: string
	date_last_updated: string
	description: string
	fee_details: Array<{
		amount: number
		fee_payer: string
		type: string
	}>
	id: number
	live_mode: boolean
	money_release_date: string
	money_release_status: string
	operation_type: string
	payment_type_id: string
	point_of_interaction: PointOfInteraction
	refunds: Array<unknown>
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