# Imaxes Térmicas

Imaxes Térmicas e unha aplicacion local para transformar imaxes da carpeta `termica/` nunha partitura aberta para piano, frauta e viola.

## Instalar

```bash
npm install
```

## Fotos

Pon as imaxes en:

```text
termica/
```

Formatos admitidos: `jpg`, `jpeg`, `png`, `webp`.

Se `termica/` esta baleira, a app tenta buscar automaticamente en:

```text
../Cadros/termica/
../termica/
```

## Arrancar

```bash
./iniciar.sh
```

Ou:

```bash
npm start
```

O porto por defecto e `3001`. Podes cambialo asi:

```bash
PORT=3010 npm start
```

## Rutas

```text
http://localhost:3001/control
http://localhost:3001/performer/piano
http://localhost:3001/performer/flute
http://localhost:3001/performer/viola
http://localhost:3001/performer/all
http://localhost:3001/stage
http://localhost:3001/admin
```

## Fluxo

1. Abre `/control`.
2. Selecciona unha foto.
3. Preme `Analizar foto`.
4. Preme `Xerar partitura`.
5. Preme `Enviar ás tablets`.
6. Cada músico abre a súa ruta performer.

## PDF

Os botóns `Descargar PDF` abren unha versión imprimible.

No diálogo do sistema escolle:

```text
Gardar como PDF
```

Tamén podes abrir directamente:

```text
http://localhost:3001/print/piano
http://localhost:3001/print/flute
http://localhost:3001/print/viola
http://localhost:3001/print/all
```

## Arquivo

Cada xeración crea unha carpeta en:

```text
archive/
```

Con:

```text
score.json
analysis.json
piano.html
flute.html
viola.html
all.html
image.*
```

## Cambiar pitch field

Edita:

```text
music/config.json
```

Campo:

```json
"pitchFieldBase": ["D", "E", "F#", "G", "A", "C"]
```

## Se non aparecen fotos

- Comproba que hai imaxes en `termica/`.
- Comproba que a extension e `jpg`, `jpeg`, `png` ou `webp`.
- Recarga `/control`.
- Mira o estado en `/admin`.

## Parar

```bash
./parar.sh
```
