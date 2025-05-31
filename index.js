console.log("🔥 INDEX.js aggiornato correttamente 🔥");
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Header manuali per CORS (tutte le richieste)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://sportivanet2.netlify.app");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, x-api-token");
  next();
});

// ✅ CORS configurato correttamente per Netlify
app.use(cors({
  origin: 'https://sportivanet2.netlify.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-token']
}));

// ✅ Gestione completa della richiesta preflight OPTIONS
app.options('*', cors({
  origin: 'https://sportivanet2.netlify.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-token']
}));

// ✅ Middleware per OPTIONS esplicito per sicurezza
app.options('/api/proxy', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://sportivanet2.netlify.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-token');
  return res.sendStatus(204);
});

// Supabase config
const SUPABASE_URL = 'https://cmnrmntmschmqrmhvouw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbnJtbnRtc2NobXFybWh2b3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDM4OTcsImV4cCI6MjA2MzkxOTg5N30.DOpPC7YZOIbgEXktSvH6Sxg_Zfw_x7-5TNdO680qZ-o';

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
    // ✅ Recupera il gettone
    if (azione === 'getGettone') {
      const { data, error } = await supabase
        .from('strutture')
        .select('gettone')
        .limit(1)
        .single();

      if (error) throw error;
      return res.json({ gettone: data.gettone });
    }

    // ✅ Mostra tabella ingressi
    if (azione === 'mostraTabella') {
      const strutturaId = req.body.struttura_id;
      if (!strutturaId) return res.status(400).json({ errore: "struttura_id mancante" });

      const { data, error } = await supabase
        .from('ingressi')
        .select('entrata_il, nome, cognome, nome_struttura')
        .eq('struttura_id', strutturaId)
        .order('entrata_il', { ascending: false });

      if (error) throw error;

      const intestazione = ["Data e ora", "Nome", "Cognome", "Struttura"];
      const righe = data.map(r => [
        r.entrata_il,
        r.nome,
        r.cognome,
        r.nome_struttura
      ]);

      return res.json([intestazione, ...righe]);
    }

    // ✅ Mostra prenotazioni
    if (azione === 'mostraPrenotazioni') {
      const strutturaId = req.body.struttura_id;
      if (!strutturaId) return res.status(400).json({ errore: "struttura_id mancante" });

      const { data, error } = await supabase
        .from('prenotazioni')
        .select('registrato_il, data_prenotata, orario, nome, cognome, nome_struttura, id')
        .eq('struttura_id', strutturaId)
        .order('data_prenotata', { ascending: true })
        .order('orario', { ascending: true });

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

    // ✅ Modifica prenotazione
    if (azione === 'modificaPrenotazione') {
      const { id, nuovaData, nuovoOrario } = req.body;
      if (!id || !nuovaData || !nuovoOrario) {
        return res.status(400).json({ errore: "Dati incompleti per la modifica" });
      }

      const { data: prenotazioneCorrente, error: errRec } = await supabase
        .from('prenotazioni')
        .select('utente_id')
        .eq('id', id)
        .single();

      if (errRec || !prenotazioneCorrente) {
        return res.status(500).json({ errore: "Errore nel recupero della prenotazione" });
      }

      const utenteId = prenotazioneCorrente.utente_id;

      const { data: duplicati, error: errCheck } = await supabase
        .from('prenotazioni')
        .select('id')
        .eq('utente_id', utenteId)
        .eq('data_prenotata', nuovaData)
        .neq('id', id);

      if (errCheck) {
        return res.status(500).json({ errore: "Errore durante il controllo prenotazioni" });
      }

      if (duplicati.length > 0) {
        return res.status(400).json({ errore: "Hai già una prenotazione per questa giornata." });
      }

      const { error } = await supabase
        .from('prenotazioni')
        .update({
          data_prenotata: nuovaData,
          orario: nuovoOrario
        })
        .eq('id', id);

      if (error) {
        return res.status(500).json({ errore: "Errore durante l'aggiornamento" });
      }

      return res.json({ success: true });
    }

    return res.status(400).json({ errore: "Azione non riconosciuta" });
  } catch (error) {
    console.error("❌ Errore nel backend:", error.message);
    return res.status(500).json({ errore: error.message });
  }
});

// ✅ Avvio server
app.listen(PORT, () => {
  console.log(`✅ Server avviato sulla porta ${PORT}`);
});
