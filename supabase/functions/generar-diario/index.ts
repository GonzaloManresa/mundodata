import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    // 1. Llamar a OpenAI para generar el diariosupabase secrets set 
    const hoy = new Date().toLocaleDateString('es-AR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const prompt = `Sos el editor de "Mundo Data", un diario diario de noticias sobre el mundo del análisis de datos en español. 
    
Hoy es ${hoy}. Generá una edición del Diario de Datos con:
- Un titular principal impactante sobre una noticia real o tendencia actual del mundo data
- Una introducción de 2-3 oraciones
- Exactamente 4 noticias/items, cada uno con:
  - titulo: string corto
  - descripcion: 2 oraciones explicando la noticia y por qué importa para alguien aprendiendo datos

Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional:
{
  "titular": "string",
  "introduccion": "string", 
  "items": [
    {"titulo": "string", "descripcion": "string"},
    {"titulo": "string", "descripcion": "string"},
    {"titulo": "string", "descripcion": "string"},
    {"titulo": "string", "descripcion": "string"}
  ]
}`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    const openaiData = await openaiRes.json();
    const content = openaiData.choices[0].message.content;
    const diario = JSON.parse(content);

    // 2. Guardar el diario en Supabase
    const fecha = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/diario`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        fecha,
        titular: diario.titular,
        introduccion: diario.introduccion,
        items: JSON.stringify(diario.items)
      })
    });

    return new Response(JSON.stringify({ ok: true, fecha, titular: diario.titular }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});