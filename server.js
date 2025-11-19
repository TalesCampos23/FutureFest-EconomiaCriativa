const express = require('express')
const cors = require('cors')
const path = require('path')
const bodyParser = require('body-parser')
const session = require('express-session')
const bcrypt = require('bcrypt')
const { MongoClient } = require('mongodb')
require('dotenv').config()
const { OpenAI } = require('openai')

const app = express()
const PORT = process.env.PORT || 3000

// ---------------------------
// 🔹 CORS
// ---------------------------
app.use(cors({
  origin: '*',
  credentials: false
}))

// ---------------------------
// 🔹 MIDDLEWARES
// ---------------------------
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(session({
  secret: 'segredo123',
  resave: false,
  saveUninitialized: true,
  cookie: { sameSite: 'lax' }
}))

// ---------------------------
// 🔹 OPENAI
// ---------------------------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// ---------------------------
// 🔹 MONGODB
// ---------------------------
const url = 'mongodb://localhost:27017'
const dbName = 'futureFestDB'
let db

MongoClient.connect(url)
  .then(clientMongo => {
    db = clientMongo.db(dbName)
    console.log('Conectado ao MongoDB')
  })
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err))

// ---------------------------
// 🔹 Arquivos estáticos
// ---------------------------
app.use(express.static(path.join(__dirname, 'public')))

// Rotas essenciais para páginas HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')))
app.get('/pagina-inicial', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pagina-inicial.html')))
app.get('/explorar', (req, res) => res.sendFile(path.join(__dirname, 'public', 'explorar.html')))
app.get('/atualizacoes', (req, res) => res.sendFile(path.join(__dirname, 'public', 'atualizacoes.html')))
app.get('/mensagens', (req, res) => res.sendFile(path.join(__dirname, 'public', 'mensagens.html')))
app.get('/configuracoes', (req, res) => res.sendFile(path.join(__dirname, 'public', 'configuracoes.html')))
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')))
app.get('/registro', (req, res) => res.sendFile(path.join(__dirname, 'public', 'registro.html')))
app.get('/campanha', (req, res) => res.sendFile(path.join(__dirname, 'public', 'campanha.html')))
app.get('/formulario-doacao', (req, res) => res.sendFile(path.join(__dirname, 'public', 'formulario-doacao.html')))

// ---------------------------
// 🔹 LOGIN
// ---------------------------
app.post('/login', async (req, res) => {
  const { email, senha } = req.body

  try {
    const user = await db.collection('usuarios').findOne({ email })
    if (!user) {
      return res.send(`<script>alert("Usuário não encontrado!"); window.location.href="/login";</script>`)
    }

    const senhaCorreta = await bcrypt.compare(senha, user.senha)
    if (!senhaCorreta) {
      return res.send(`<script>alert("Senha incorreta!"); window.location.href="/login";</script>`)
    }

    req.session.user = user
    res.redirect('/pagina-inicial')
  } catch (error) {
    console.error('Erro no login:', error)
    res.send(`<script>alert("Erro ao fazer login."); window.location.href="/login";</script>`)
  }
})

// ---------------------------
// 🔹 REGISTRO
// ---------------------------
app.post('/registro', async (req, res) => {
  const { nome, email, senha } = req.body

  try {
    const jaExiste = await db.collection('usuarios').findOne({ email })
    if (jaExiste) {
      return res.send(`<script>alert("Email já registrado!"); window.location.href="/registro";</script>`)
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10)
    const novoUsuario = { nome, email, senha: senhaCriptografada }

    await db.collection('usuarios').insertOne(novoUsuario)

    res.send(`<script>alert("Usuário registrado com sucesso! Faça login."); window.location.href="/login";</script>`)
  } catch (error) {
    console.error('Erro ao registrar usuário:', error)
    res.send(`<script>alert("Erro ao registrar usuário."); window.location.href="/registro";</script>`)
  }
})

// ---------------------------
// 🔹 Rota obrigatória — campanhas
// ---------------------------
app.get('/api/campaigns', (req, res) => {
  const sample = [
    { id: 1, titulo: 'Escola Comunidade Viva', desc: 'Reforço escolar + cestas básicas', tags: ['alimentos'], regiao: 'SP' },
    { id: 2, titulo: 'Banco de Alimentos Paulista', desc: 'Triagem e distribuição', tags: ['alimentos'], regiao: 'SP' },
    { id: 3, titulo: 'Saúde Solidária RJ', desc: 'Clínica comunitária', tags: ['saude'], regiao: 'RJ' },
    { id: 4, titulo: 'Mães Que Educam', desc: 'Apoio a mães', tags: ['voluntariado'], regiao: 'RJ' }
  ]
  res.json({ ok: true, campaigns: sample })
})

// ---------------------------
// 🔹 HEALTH CHECK
// ---------------------------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() })
})

// ---------------------------
// 🔥 IA SUPREMA — CORRIGIDA E ATUALIZADA
// ---------------------------
const SYSTEM_IA_SUPREMA = `
Você é **ConectaIA Suprema**, IA oficial do ConectaDoa.

REGRAS PRINCIPAIS:
1. Sempre entender estados corretamente (SP, RJ, MG, CE, BA, etc).
2. Nunca confundir SP com PA, nem RJ com SP.
3. Ao recomendar ONGs → filtrar por estado + tipo.
4. Ao gerar impacto → usar apenas aqueles números daquele estado.
5. Responder sempre com:
   • Resumo 1 linha  
   • Explicação detalhada  
   • 3 ações práticas  
   • "Por que isso importa"
6. Nunca dar respostas curtas.
7. Seja profissional, empática e clara.
`

app.post('/api/openai', async (req, res) => {
  try {
    const { prompt = '' } = req.body
    if (!prompt) return res.status(400).json({ error: 'prompt é obrigatório' })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 900,
      messages: [
        { role: 'system', content: SYSTEM_IA_SUPREMA },
        { role: 'user', content: prompt }
      ]
    })

    res.json({ text: completion.choices[0].message.content })

  } catch (err) {
    console.error('Erro OpenAI:', err)
    res.status(500).json({ text: null, error: String(err) })
  }
})

// ---------------------------
// 🔹 404 fallback
// ---------------------------
app.use((req, res) => {
  res.status(404).send("Página não encontrada.")
})

// ---------------------------
// 🔥 START SERVER
// ---------------------------
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})