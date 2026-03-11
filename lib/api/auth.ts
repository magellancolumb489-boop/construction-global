import { createClient } from "@/lib/supabase/client"

// Real Supabase auth -- replaces the previous mock implementation
export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function register(data: {
  email: string
  password: string
  displayName: string
  phone?: string
  isCompany: boolean
  companyName?: string
  vatNumber?: string
  companyAddress?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        display_name: data.displayName,
        phone: data.phone ?? "",
        is_company: data.isCompany,
        company_name: data.companyName ?? "",
        vat_number: data.vatNumber ?? "",
        company_address: data.companyAddress ?? "",
      },
    },
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function forgotPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function logout(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}
