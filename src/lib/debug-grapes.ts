import { createClient } from '@/lib/supabase/client'

// Debug utility to check grape and image data
export async function debugGrapeData() {
  const supabase = createClient()
  
  console.log('=== DEBUGGING GRAPE DATA ===')
  
  // Check grapes table
  const { data: grapes, error: grapesError } = await supabase
    .from('grapes')
    .select('grape_id, grape_variety')
    .limit(5)
  
  console.log('Grapes table:', grapes)
  if (grapesError) console.error('Grapes error:', grapesError)
  
  // Check grape_images table
  const { data: images, error: imagesError } = await supabase
    .from('grape_images')
    .select('grape_id, image_urls')
    .limit(5)
  
  console.log('Grape images table:', images)
  if (imagesError) console.error('Images error:', imagesError)
  
  // Check if there are any matching grape_ids
  if (grapes && images) {
    const grapeIds = grapes.map(g => g.grape_id)
    const imageGrapeIds = images.map(i => i.grape_id)
    const matchingIds = grapeIds.filter(id => imageGrapeIds.includes(id))
    
    console.log('Matching grape_ids between tables:', matchingIds)
    
    if (matchingIds.length > 0) {
      const testGrapeId = matchingIds[0]
      console.log(`Testing with grape_id: ${testGrapeId}`)
      
      const { data: testImage } = await supabase
        .from('grape_images')
        .select('image_urls')
        .eq('grape_id', testGrapeId)
        .single()
      
      console.log('Test image URL:', testImage?.image_urls)
    }
  }
  
  console.log('=== END DEBUG ===')
}

// Function to test a specific grape
export async function testSpecificGrape(grapeId: number) {
  const supabase = createClient()
  
  console.log(`=== TESTING GRAPE ID: ${grapeId} ===`)
  
  // Get grape info
  const { data: grape, error: grapeError } = await supabase
    .from('grapes')
    .select('*')
    .eq('grape_id', grapeId)
    .single()
  
  console.log('Grape data:', grape)
  if (grapeError) console.error('Grape error:', grapeError)
  
  // Get image
  const { data: image, error: imageError } = await supabase
    .from('grape_images')
    .select('image_urls')
    .eq('grape_id', grapeId)
    .single()
  
  console.log('Image data:', image)
  if (imageError) console.error('Image error:', imageError)
  
  console.log('=== END TEST ===')
}
