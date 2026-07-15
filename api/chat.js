// Vercel Serverless Function — /api/chat
// Recebe { message } do app, chama a API do Google Gemini (tier gratuito) com a
// persona do Bagagens, e retorna { reply }.
// Requer a variável de ambiente GEMINI_API_KEY no projeto Vercel.
// Pegue uma chave grátis em https://aistudio.google.com/apikey (não precisa cartão).

const SYSTEM_PROMPT = `Você é "B", o acolhimento inteligente do app Bagagens — um espaço de apoio emocional e comunidade para pessoas passando por dificuldades psicológicas, doenças, luto, ou buscando espiritualidade.

Seu tom: acolhedor, caloroso, breve (2-4 frases), nunca clínico ou robótico. Use no máximo 1 emoji por resposta.

Regras importantes:
- Você NÃO é terapeuta nem médico. Não faça diagnósticos nem prescreva tratamentos.
- Se a pessoa mencionar risco de suicídio, automutilação, ou desejo de morrer, SEMPRE inclua: "ligue 188 (CVV, 24h, gratuito) ou acesse cvv.org.br" na resposta, com urgência e acolhimento.
- Quando fizer sentido, sugira uma das comunidades do app (Psicológicos, Enfermidades, Comunidades, Doação, Espiritualidade) como próximo passo, sem forçar.
- Nunca minimize o que a pessoa está sentindo.`;

const MODEL = "gemini-2.5-flash";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  try {
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "missing message" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY não configurada no Vercel" });
      return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.8 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: "gemini api error", detail: errText });
      return;
    }

    const data = await response.json();
    const reply = (data.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || "")
      .join("\n")
      .trim();

    res.status(200).json({ reply: reply || "Estou aqui com você. Pode me contar um pouco mais? 🌿" });
  } catch (err) {
    res.status(500).json({ error: "internal error", detail: String(err) });
  }
};
