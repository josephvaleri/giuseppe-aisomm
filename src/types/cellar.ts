export interface CellarItem {
  bottle_id: number
  wine_id: number
  wine_name?: string
  producer?: string
  vintage?: number
  appellation?: string
  region_name?: string
  country_name?: string
  quantity: number
  where_stored?: string
  value?: number
  currency: string
  status: 'stored' | 'drank' | 'lost'
  my_notes?: string
  my_rating?: number
  created_at: string
  updated_at: string
}

export interface Wine {
  wine_id: number
  wine_name?: string
  producer?: string
  vintage?: number
  alcohol?: string
  country_id?: string
  region_id?: number
  appellation_id?: number
  bottle_size?: '750ml' | '375ml' | '187ml' | 'other'
  drink_starting?: string
  drink_by?: string
  barcode?: string
  my_score?: number
  color?: string
  created_from_analysis?: boolean
  analysis_confidence?: number
  created_at: string
}

export interface WineMatch {
  wine_id: number
  wine_name: string
  producer?: string
  vintage?: number
  match_score: number
  total_score: number
}

export interface CSVWineData {
  wine_name: string
  producer?: string
  vintage?: number
  appellation?: string
  country_id?: string
  region_id?: number
  quantity?: number
  where_stored?: string
  value?: number
  currency?: string
  my_notes?: string
  my_rating?: number
  status?: 'stored' | 'drank' | 'lost'
  bottle_size?: '750ml' | '375ml' | '187ml' | 'other'
  alcohol?: string
  barcode?: string
}

export interface BatchInsertResult {
  bottle_id: number
  wine_id: number
  wine_name: string
  status: string
  match_type: 'existing_wine' | 'new_wine'
}

export interface CellarStats {
  totalWines: number
  storedWines: number
  drankWines: number
  lostWines: number
  totalValue: number
}
