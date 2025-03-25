export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			stripe_customers: {
				Row: {
					id: number;
					user_id: string;
					stripe_customer_id: string;
					email: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: number;
					user_id: string;
					stripe_customer_id: string;
					email?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: number;
					user_id?: string;
					stripe_customer_id?: string;
					email?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'stripe_customers_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'users';
						referencedColumns: ['id'];
					}
				];
			};
			subscriptions: {
				Row: {
					id: number;
					user_id: string;
					stripe_subscription_id: string;
					stripe_customer_id: string;
					status: string;
					price_id: string;
					quantity: number;
					cancel_at_period_end: boolean;
					current_period_start: string;
					current_period_end: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: number;
					user_id: string;
					stripe_subscription_id: string;
					stripe_customer_id: string;
					status: string;
					price_id: string;
					quantity?: number;
					cancel_at_period_end?: boolean;
					current_period_start: string;
					current_period_end: string;
					created_at: string;
					updated_at: string;
				};
				Update: {
					id?: number;
					user_id?: string;
					stripe_subscription_id?: string;
					stripe_customer_id?: string;
					status?: string;
					price_id?: string;
					quantity?: number;
					cancel_at_period_end?: boolean;
					current_period_start?: string;
					current_period_end?: string;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'subscriptions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: true;
						referencedRelation: 'users';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'subscriptions_stripe_customer_id_fkey';
						columns: ['stripe_customer_id'];
						isOneToOne: false;
						referencedRelation: 'stripe_customers';
						referencedColumns: ['stripe_customer_id'];
					}
				];
			};
			// ... any other existing tables
		};
		Views: {
			// ... any existing views
		};
		Functions: {
			// ... any existing functions
		};
		Enums: {
			// ... any existing enums
		};
	};
}
