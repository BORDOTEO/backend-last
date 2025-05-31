const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ CORS completo: solo Netlify, gestisce anche preflight
app.use(cors({
  origin: 'https://sportivanet.netlify.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-token'],
  credentials: true
}));

// ✅ Gestione preflight automatica
app.options('*', cors());

// Usa qui i tuoi dati Supabase
const SUPABASE_URL = 'https://cmnrmntmschmqrmhvouw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_TOKEN = 'supersegreto123';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.post('/api/proxy', async (req, res) => {
  const { azione } = req.body;
  const token = req.headers['x-api-token'];

  if (token !== API_TOKEN) {
    return res.status(403).json({ errore: 'Token API non valido' });
  }

  try {
    if (azione === 'getGettone') {
      // Recupera gettone dalla prima struttura
      const { data, error } = await supabase
        .from('strutture')
        .select('gettone')
        .limit(1)
        .single();

      if (error) throw error;

      return res.json({ gettone: data.gettone });
    }

    if (azione === 'mostraTabella') {
    const strutturaId = req.body.struttura_id;
    if (!strutturaId) return res.status(400).json({ errore: "struttura_id mancante" });

    const { data, error } = await supabase
      .from('ingressi')
      .select('entrata_il, nome, cognome, nome_struttura')
      .eq('struttura_id', strutturaId)
      .order('entrata_il', { ascending: false });


      if (error) throw error;

      // Prepara array con intestazione + dati
      const intestazione = ["Data e ora", "Nome", "Cognome", "Struttura"];
      const righe = data.map(r => [
        r.entrata_il,
        r.nome,
        r.cognome,
        r.nome_struttura,
      ]);

      return res.json([intestazione, ...righe]);
    }

    if (azione === 'mostraPrenotazioni') {
    const strutturaId = req.body.struttura_id;
    if (!strutturaId) return res.status(400).json({ errore: "struttura_id mancante" });

    const { data, error } = await supabase
      .from('prenotazioni')
      .select('registrato_il, data_prenotata, orario, nome, cognome, nome_struttura, id')
      .eq('struttura_id', strutturaId)
      .order('data_prenotata', { ascending: true })
      .order('orario', { ascending: true });  // ✅ Nuovo ordinamento combinato

    if (error) throw error;

    const intestazione = ["Registrata il", "Data prenotata", "Ora", "Nome", "Cognome", "Struttura", "ID"];
    const righe = data.map(r => [
      r.registrato_il,
      r.data_prenotata,
      r.orario,
      r.nome,
      r.cognome,
      r.nome_struttura,
      r.id
    ]);

    return res.json([intestazione, ...righe]);
  }


  if (azione === 'modificaPrenotazione') {
const { id, nuovaData, nuovoOrario } = req.body;

if (!id || !nuovaData || !nuovoOrario) {
  return res.status(400).json({ errore: "Dati incompleti per la modifica" });
}

// 🔍 Recupera utente_id della prenotazione corrente
const { data: prenotazioneCorrente, error: errRec } = await supabase
  .from('prenotazioni')
  .select('utente_id')
  .eq('id', id)
  .single();

if (errRec || !prenotazioneCorrente) {
  return res.status(500).json({ errore: "Errore nel recupero della prenotazione" });
}

const utenteId = prenotazioneCorrente.utente_id;

// ❌ Controlla se esiste già un'altra prenotazione per la stessa data
const { data: duplicati, error: errCheck } = await supabase
  .from('prenotazioni')
  .select('id')
  .eq('utente_id', utenteId)
  .eq('data_prenotata', nuovaData)
  .neq('id', id);  // esclude la prenotazione corrente

if (errCheck) {
  return res.status(500).json({ errore: "Errore durante il controllo prenotazioni" });
}

if (duplicati.length > 0) {
  return res.status(400).json({ errore: "Hai già una prenotazione per questa giornata." });
}

// ✅ Procedi con la modifica
const { error } = await supabase
  .from('prenotazioni')
  .update({
    data_prenotata: nuovaData,
    orario: nuovoOrario
  })
  .eq('id', id);

if (error) {
  console.error("Errore Supabase:", error);
  return res.status(500).json({ errore: "Errore durante l'aggiornamento" });
}

return res.json({ success: true });
}




    // Se l’azione non è riconosciuta
    return res.status(400).json({ errore: "Azione non riconosciuta" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ errore: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);

});
