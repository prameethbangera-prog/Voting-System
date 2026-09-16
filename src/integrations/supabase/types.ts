export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      candidates: {
        Row: {
          bio: string
          created_at: string
          election_id: string
          id: string
          name: string
          party: string
          photo_url: string
        }
        Insert: {
          bio?: string
          created_at?: string
          election_id: string
          id?: string
          name: string
          party: string
          photo_url: string
        }
        Update: {
          bio?: string
          created_at?: string
          election_id?: string
          id?: string
          name?: string
          party?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          }
        ]
      }
      elections: {
        Row: {
          created_at: string
          created_by: string
          description: string
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          title: string
          access_code: string | null
          results_access_offset_minutes: number | null
          results_published: boolean
          results_published_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          title: string
          access_code?: string | null
          results_access_offset_minutes?: number | null
          results_published?: boolean
          results_published_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          title?: string
          access_code?: string | null
          results_access_offset_minutes?: number | null
          results_published?: boolean
          results_published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      otp_requests: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "otp_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string
          face_image_url: string | null
          full_name: string | null
          id: string
          palm_image_url: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          email: string
          face_image_url?: string | null
          full_name?: string | null
          id: string
          palm_image_url?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          email?: string
          face_image_url?: string | null
          full_name?: string | null
          id?: string
          palm_image_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_biometrics: {
        Row: {
          created_at: string
          face_verified: boolean
          id: string
          palm_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          face_verified?: boolean
          id?: string
          palm_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          face_verified?: boolean
          id?: string
          palm_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_biometrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      votes: {
        Row: {
          candidate_id: string
          created_at: string
          election_id: string
          id: string
          transaction_hash: string | null
          voter_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          election_id: string
          id?: string
          transaction_hash?: string | null
          voter_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          election_id?: string
          id?: string
          transaction_hash?: string | null
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          }
        ]
      }
      vote_results: {
        Row: {
          candidate_id: string
          election_id: string
          total_votes: number
        }
        Insert: {
          candidate_id: string
          election_id: string
          total_votes?: number
        }
        Update: {
          candidate_id?: string
          election_id?: string
          total_votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "vote_results_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_results_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_election_with_code: {
        Args: { p_code: string }
        Returns: Json
      }
      complete_session_biometrics: {
        Args: {
          p_token: string
          p_face_verified?: boolean | null
          p_palm_verified?: boolean | null
          p_face_image_url?: string | null
        }
        Returns: Json
      }
      get_session_ballot: {
        Args: { p_token: string }
        Returns: Json
      }
      cast_vote_with_session: {
        Args: { p_token: string; p_candidate_id: string }
        Returns: Json
      }
      generate_election_access_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_published_election_results: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      set_election_results_published: {
        Args: { p_election_id: string; p_published: boolean }
        Returns: Json
      }
      ensure_election_access_code: {
        Args: { p_election_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] & {
      Schema: PublicTableNameOrOptions["schema"]
    }
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] & {
        Schema: "public"
      }
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
