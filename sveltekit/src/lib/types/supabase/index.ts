export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			// Add your Supabase tables here
			// Example:
			// profiles: {
			//   Row: {
			//     id: string
			//     email: string
			//     name: string | null
			//     avatar_url: string | null
			//     created_at: string
			//   }
			//   Insert: {
			//     id: string
			//     email: string
			//     name?: string | null
			//     avatar_url?: string | null
			//     created_at?: string
			//   }
			//   Update: {
			//     id?: string
			//     email?: string
			//     name?: string | null
			//     avatar_url?: string | null
			//     created_at?: string
			//   }
			// }
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
	};
}
