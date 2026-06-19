export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          name: string;
          phone: string;
          vehicle_id: string | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          vehicle_id?: string | null;
          status?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          vehicle_id?: string | null;
          status?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicle_documents: {
        Row: {
          id: string;
          vehicle_id: string;
          name: string;
          url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          name: string;
          url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          name?: string;
          url?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      installments: {
        Row: {
          amount: number;
          created_at: string;
          due_date: string;
          id: string;
          negotiation_id: string;
          notes: string | null;
          payment_date: string | null;
          payment_method: string | null;
          received_amount: number | null;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          due_date: string;
          id?: string;
          negotiation_id: string;
          notes?: string | null;
          payment_date?: string | null;
          payment_method?: string | null;
          received_amount?: number | null;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          due_date?: string;
          id?: string;
          negotiation_id?: string;
          notes?: string | null;
          payment_date?: string | null;
          payment_method?: string | null;
          received_amount?: number | null;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "installments_negotiation_id_fkey";
            columns: ["negotiation_id"];
            isOneToOne: false;
            referencedRelation: "negotiations";
            referencedColumns: ["id"];
          },
        ];
      };
      negotiation_logs: {
        Row: {
          created_at: string | null;
          description: string | null;
          event_type: string;
          id: string;
          metadata: Json | null;
          negotiation_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          event_type: string;
          id?: string;
          metadata?: Json | null;
          negotiation_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          event_type?: string;
          id?: string;
          metadata?: Json | null;
          negotiation_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "negotiation_logs_negotiation_id_fkey";
            columns: ["negotiation_id"];
            isOneToOne: false;
            referencedRelation: "negotiations";
            referencedColumns: ["id"];
          },
        ];
      };
      negotiations: {
        Row: {
          buyer_cpf: string | null;
          buyer_email: string | null;
          buyer_name: string | null;
          buyer_phone: string | null;
          cash_amount: number;
          created_at: string;
          down_payment_amount: number | null;
          down_payment_date: string | null;
          down_payment_method: string | null;
          financial_status: string | null;
          first_installment_date: string | null;
          id: string;
          installment_count: number | null;
          payment_method: string | null;
          remaining_balance: number;
          sale_date: string;
          sale_price: number;
          status: string | null;
          trade_in_value: number | null;
          trade_in_vehicle_id: string | null;
          updated_at: string;
          vehicle_id: string;
        };
        Insert: {
          buyer_cpf?: string | null;
          buyer_email?: string | null;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          cash_amount?: number;
          created_at?: string;
          down_payment_amount?: number | null;
          down_payment_date?: string | null;
          down_payment_method?: string | null;
          financial_status?: string | null;
          first_installment_date?: string | null;
          id?: string;
          installment_count?: number | null;
          payment_method?: string | null;
          remaining_balance?: number;
          sale_date?: string;
          sale_price: number;
          status?: string | null;
          trade_in_value?: number | null;
          trade_in_vehicle_id?: string | null;
          updated_at?: string;
          vehicle_id: string;
        };
        Update: {
          buyer_cpf?: string | null;
          buyer_email?: string | null;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          cash_amount?: number;
          created_at?: string;
          down_payment_amount?: number | null;
          down_payment_date?: string | null;
          down_payment_method?: string | null;
          financial_status?: string | null;
          first_installment_date?: string | null;
          id?: string;
          installment_count?: number | null;
          payment_method?: string | null;
          remaining_balance?: number;
          sale_date?: string;
          sale_price?: number;
          status?: string | null;
          trade_in_value?: number | null;
          trade_in_vehicle_id?: string | null;
          updated_at?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "negotiations_trade_in_vehicle_id_fkey";
            columns: ["trade_in_vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "negotiations_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: true;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          is_admin: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          is_admin?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_admin?: boolean | null;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          key: string;
          updated_at: string | null;
          value: string;
        };
        Insert: {
          key: string;
          updated_at?: string | null;
          value: string;
        };
        Update: {
          key?: string;
          updated_at?: string | null;
          value?: string;
        };
        Relationships: [];
      };
      vehicle_expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          created_by: string | null;
          description: string;
          expense_date: string;
          id: string;
          user_id: string;
          vehicle_id: string;
        };
        Insert: {
          amount?: number;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          description: string;
          expense_date?: string;
          id?: string;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          expense_date?: string;
          id?: string;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_expenses_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          ad_text: string | null;
          asking_price: number | null;
          brand: string;
          buyer_address: string | null;
          buyer_cpf: string | null;
          buyer_email: string | null;
          buyer_name: string | null;
          buyer_phone: string | null;
          chassis: string | null;
          color: string | null;
          commission_rate: number | null;
          commission_type: string | null;
          created_at: string;
          down_payment_amount: number | null;
          down_payment_date: string | null;
          down_payment_method: string | null;
          first_installment_date: string | null;
          fuel: string | null;
          has_trade_in: boolean | null;
          id: string;
          intermediary_commission: number | null;
          is_published: boolean | null;
          is_trade_in: boolean | null;
          mileage: number | null;
          model: string;
          notes: string | null;
          origin_negotiation_id: string | null;
          owner_address: string | null;
          owner_cpf: string | null;
          owner_email: string | null;
          owner_name: string | null;
          owner_phone: string | null;
          payment_installments: number | null;
          payment_method: string | null;
          photos: string[];
          plate: string | null;
          profit_margin_pct: number;
          purchase_date: string | null;
          purchase_price: number;
          renavam: string | null;
          sale_date: string | null;
          sale_price: number | null;
          status: string;
          tax_amount: number | null;
          tax_rate: number | null;
          trade_in_entry_value: number | null;
          trade_in_publish: boolean | null;
          trade_in_resale_value: number | null;
          trade_in_status: string | null;
          trade_in_vehicle_id: string | null;
          transmission: string | null;
          updated_at: string;
          user_id: string;
          year: number | null;
        };
        Insert: {
          ad_text?: string | null;
          asking_price?: number | null;
          brand: string;
          buyer_address?: string | null;
          buyer_cpf?: string | null;
          buyer_email?: string | null;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          chassis?: string | null;
          color?: string | null;
          commission_rate?: number | null;
          commission_type?: string | null;
          created_at?: string;
          down_payment_amount?: number | null;
          down_payment_date?: string | null;
          down_payment_method?: string | null;
          first_installment_date?: string | null;
          fuel?: string | null;
          has_trade_in?: boolean | null;
          id?: string;
          intermediary_commission?: number | null;
          is_published?: boolean | null;
          is_trade_in?: boolean | null;
          mileage?: number | null;
          model: string;
          notes?: string | null;
          origin_negotiation_id?: string | null;
          owner_address?: string | null;
          owner_cpf?: string | null;
          owner_email?: string | null;
          owner_name?: string | null;
          owner_phone?: string | null;
          payment_installments?: number | null;
          payment_method?: string | null;
          photos?: string[];
          plate?: string | null;
          profit_margin_pct?: number;
          purchase_date?: string | null;
          purchase_price?: number;
          renavam?: string | null;
          sale_date?: string | null;
          sale_price?: number | null;
          status?: string;
          tax_amount?: number | null;
          tax_rate?: number | null;
          trade_in_entry_value?: number | null;
          trade_in_publish?: boolean | null;
          trade_in_resale_value?: number | null;
          trade_in_status?: string | null;
          trade_in_vehicle_id?: string | null;
          transmission?: string | null;
          updated_at?: string;
          user_id: string;
          year?: number | null;
        };
        Update: {
          ad_text?: string | null;
          asking_price?: number | null;
          brand?: string;
          buyer_address?: string | null;
          buyer_cpf?: string | null;
          buyer_email?: string | null;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          chassis?: string | null;
          color?: string | null;
          commission_rate?: number | null;
          commission_type?: string | null;
          created_at?: string;
          down_payment_amount?: number | null;
          down_payment_date?: string | null;
          down_payment_method?: string | null;
          first_installment_date?: string | null;
          fuel?: string | null;
          has_trade_in?: boolean | null;
          id?: string;
          intermediary_commission?: number | null;
          is_published?: boolean | null;
          is_trade_in?: boolean | null;
          mileage?: number | null;
          model?: string;
          notes?: string | null;
          origin_negotiation_id?: string | null;
          owner_address?: string | null;
          owner_cpf?: string | null;
          owner_email?: string | null;
          owner_name?: string | null;
          owner_phone?: string | null;
          payment_installments?: number | null;
          payment_method?: string | null;
          photos?: string[];
          plate?: string | null;
          profit_margin_pct?: number;
          purchase_date?: string | null;
          purchase_price?: number;
          renavam?: string | null;
          sale_date?: string | null;
          sale_price?: number | null;
          status?: string;
          tax_amount?: number | null;
          tax_rate?: number | null;
          trade_in_entry_value?: number | null;
          trade_in_publish?: boolean | null;
          trade_in_resale_value?: number | null;
          trade_in_status?: string | null;
          trade_in_vehicle_id?: string | null;
          transmission?: string | null;
          updated_at?: string;
          user_id?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_origin_negotiation_id_fkey";
            columns: ["origin_negotiation_id"];
            isOneToOne: false;
            referencedRelation: "negotiations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicles_trade_in_vehicle_id_fkey";
            columns: ["trade_in_vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
