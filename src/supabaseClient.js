import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oqltxubuduojxsqzdwlz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xbHR4dWJ1ZHVvanhzcXpkd2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjI0MTgsImV4cCI6MjA3Njc5ODQxOH0.BmdPs1fENL-R5NngjC5NpCNbJf70X4ofBb2cwvqijZY'
export const supabase = createClient(supabaseUrl, supabaseKey)