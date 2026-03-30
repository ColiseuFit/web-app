/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = 'c:/Users/colis/Documents/site-coliseu-v2/Fotos Login';
const outputDir = 'c:/Users/colis/Documents/site-coliseu-v2/public/images/login';

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const files = [
    { name: '0P7A3658.jpg', output: 'hero-power.webp' },
    { name: '0P7A4383.jpg', output: 'hero-focus.webp' },
    { name: '0P7A5145.jpg', output: 'hero-community.webp' },
    { name: '0P7A4863.jpg', output: 'hero-grit.webp' }
];

async function processImages() {
    console.log('--- Iniciando Processamento Iron Signature ---');
    
    for (const file of files) {
        const inputPath = path.join(inputDir, file.name);
        const outputPath = path.join(outputDir, file.output);
        
        console.log(`Processando: ${file.name} -> ${file.output}`);
        
        try {
            await sharp(inputPath)
                .resize(1920, 1080, { fit: 'cover', position: 'center' })
                .grayscale() // Começar com P&B para o efeito desaturado
                .linear(1.2, -0.1) // Aumentar contraste
                .tint({ r: 227, g: 27, b: 35 }) // Tintura Carmesim (#E31B23)
                .webp({ quality: 80 })
                .toFile(outputPath);
            
            console.log(`✓ Sucesso: ${file.output}`);
        } catch (err) {
            console.error(`✗ Erro ao processar ${file.name}:`, err.message);
        }
    }
    
    console.log('--- Fim do Processamento ---');
}

processImages();
