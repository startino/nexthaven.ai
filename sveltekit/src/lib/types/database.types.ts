export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			customers: {
				Row: {
					created_at: string;
					stripe_customer_id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					stripe_customer_id: string;
					user_id?: string;
				};
				Update: {
					created_at?: string;
					stripe_customer_id?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			search_history: {
				Row: {
					budget: Json | null;
					created_at: string | null;
					date_range: string | null;
					destination: string | null;
					id: string;
					preferences: string | null;
					results_count: number | null;
					rooms: number | null;
					search_query: Json;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					budget?: Json | null;
					created_at?: string | null;
					date_range?: string | null;
					destination?: string | null;
					id?: string;
					preferences?: string | null;
					results_count?: number | null;
					rooms?: number | null;
					search_query: Json;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					budget?: Json | null;
					created_at?: string | null;
					date_range?: string | null;
					destination?: string | null;
					id?: string;
					preferences?: string | null;
					results_count?: number | null;
					rooms?: number | null;
					search_query?: Json;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			search_results: {
				Row: {
					id: string;
					search_id: string;
					property_name: string;
					property_url: string | null;
					price: number | null;
					location: string | null;
					rooms: number | null;
					baths: number | null;
					amenities: Json | null;
					score: number | null;
					image_url: string | null;
					gallery: Json | null;
					property_data: Json;
					created_at: string;
				};
				Insert: {
					id?: string;
					search_id: string;
					property_name: string;
					property_url?: string | null;
					price?: number | null;
					location?: string | null;
					rooms?: number | null;
					baths?: number | null;
					amenities?: Json | null;
					score?: number | null;
					image_url?: string | null;
					gallery?: Json | null;
					property_data: Json;
					created_at?: string;
				};
				Update: {
					id?: string;
					search_id?: string;
					property_name?: string;
					property_url?: string | null;
					price?: number | null;
					location?: string | null;
					rooms?: number | null;
					baths?: number | null;
					amenities?: Json | null;
					score?: number | null;
					image_url?: string | null;
					gallery?: Json | null;
					property_data?: Json;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'search_results_search_id_fkey';
						columns: ['search_id'];
						referencedRelation: 'search_history';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
	PublicTableNameOrOptions extends
		| keyof (PublicSchema['Tables'] & PublicSchema['Views'])
		| { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
				Database[PublicTableNameOrOptions['schema']]['Views'])
		: never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
			Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
		? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
		: never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema['Tables']
		? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
	TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
		: never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
	? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: PublicTableNameOrOptions extends keyof PublicSchema['Tables']
		? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
	EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
		? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
		: never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
	? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
	: PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
		? PublicSchema['Enums'][PublicEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof PublicSchema['CompositeTypes']
		| { schema: keyof Database },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
	? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
		? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;
