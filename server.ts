import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Shared Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint for analyzing meal plate photos with AI (Gemini 3.8 Flash)
app.post('/api/analyze-plate', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', userNotes } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada para análise.' });
    }

    // Clean base64 data if it includes data URL prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `
Você é um nutricionista clínico especialista em diabetes e contagem de carboidratos segundo as tabelas oficiais da Sociedade Brasileira de Diabetes (SBD) e TACO (Tabela Brasileira de Composição de Alimentos).
Analise com atenção a imagem do prato/refeição enviada.
Identifique cada alimento visível, estime o peso em gramas, a medida caseira aproximada (ex: "4 colheres de sopa", "1 concha média", "1 filé médio"), os carboidratos líquidos totais (CHO em gramas), proteínas (g), gorduras totais (g), fibras (g) e calorias (kcal).
Forneça também um parecer clínico sucinto em português brasileiro (impacto glicêmico esperado, se há muita gordura retardando a absorção, e sugestão para o bolus).
${userNotes ? `Observações informadas pelo usuário: "${userNotes}"` : ''}
Retorne estritamente o JSON estruturado.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mealTitle: {
              type: Type.STRING,
              description: 'Nome curto da refeição sugerido (ex: Almoço com Arroz, Feijão e Frango)',
            },
            totalCarbsGrams: {
              type: Type.NUMBER,
              description: 'Total de carboidratos líquidos em gramas',
            },
            totalProteinGrams: {
              type: Type.NUMBER,
              description: 'Total de proteínas em gramas',
            },
            totalFatGrams: {
              type: Type.NUMBER,
              description: 'Total de gorduras em gramas',
            },
            totalCaloriesKcal: {
              type: Type.NUMBER,
              description: 'Total de calorias em kcal',
            },
            glycemicImpact: {
              type: Type.STRING,
              description: 'Impacto glicêmico esperado: Baixo, Moderado, Alto ou Misto com pico tardio',
            },
            clinicalNotes: {
              type: Type.STRING,
              description: 'Dica clínica em português (ex: presença de lipídios/fibras, timing do bolus)',
            },
            items: {
              type: Type.ARRAY,
              description: 'Lista de alimentos identificados no prato',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: 'Nome do alimento em português',
                  },
                  portionDescription: {
                    type: Type.STRING,
                    description: 'Medida caseira estimada (ex: 4 colheres de sopa rasas)',
                  },
                  estimatedGrams: {
                    type: Type.NUMBER,
                    description: 'Peso estimado em gramas',
                  },
                  carbsGrams: {
                    type: Type.NUMBER,
                    description: 'Carboidratos em gramas',
                  },
                  proteinGrams: {
                    type: Type.NUMBER,
                    description: 'Proteínas em gramas',
                  },
                  fatGrams: {
                    type: Type.NUMBER,
                    description: 'Gorduras em gramas',
                  },
                  caloriesKcal: {
                    type: Type.NUMBER,
                    description: 'Calorias do alimento',
                  },
                },
                required: ['name', 'portionDescription', 'estimatedGrams', 'carbsGrams', 'proteinGrams', 'fatGrams'],
              },
            },
          },
          required: [
            'mealTitle',
            'totalCarbsGrams',
            'totalProteinGrams',
            'totalFatGrams',
            'totalCaloriesKcal',
            'glycemicImpact',
            'clinicalNotes',
            'items',
          ],
        },
      },
    });

    const responseText = response.text?.trim() || '{}';
    const parsedData = JSON.parse(responseText);

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Erro na análise com Gemini:', error);
    return res.status(500).json({
      error: 'Falha ao analisar a foto do prato. Verifique a imagem ou tente novamente.',
      details: error.message,
    });
  }
});

// Production / Dev handling
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Minha Glico rodando na porta ${PORT}`);
  });
}

startServer();
