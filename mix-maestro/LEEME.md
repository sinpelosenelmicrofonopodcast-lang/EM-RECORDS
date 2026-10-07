# Mix Maestro 0.1 — FL Studio / Apple Silicon

Paquete de codigo fuente y compilacion local. NO contiene un VST3 precompilado, ni un instalador .pkg. La integracion JUCE/macOS y la carga en FL Studio estan pendientes de verificacion en un Mac.

## Compilar e instalar

1. Cierra FL Studio. Extrae todo el ZIP en una carpeta local.
2. Instala Apple Command Line Tools si faltan: `xcode-select --install`.
3. Instala CMake 3.22 o posterior desde https://cmake.org/download/. Si usas la app CMake, habilita sus herramientas de linea de comandos siguiendo sus instrucciones. Si ya tienes Homebrew: `brew install cmake`.
4. Abre `BUILD_AND_INSTALL.command`. Si Finder no conserva su permiso ejecutable, abre Terminal, escribe `bash `, arrastra el archivo a Terminal y pulsa Enter.
5. La primera compilacion descarga JUCE 8.0.12 desde GitHub y necesita internet. Luego compila arm64, firma localmente y copia el plugin a `~/Library/Audio/Plug-Ins/VST3/Mix Maestro.vst3`. No necesita sudo.
6. Abre FL Studio nativamente, sin Rosetta. En Options > Manage plugins ejecuta Find installed plugins con Verify plugins. Marca Mix Maestro e insertalo en un slot del Mixer.

Si falla la compilacion, comparte `build-install.log`. La firma local no equivale a firma Developer ID ni notarizacion; no se promete distribucion publica lista para instalar.

## Ejemplo realista

"Mix Maestro, revisa el nivel y el estereo de mi mezcla de bachata. Quiero saber si hay muestras cerca de full scale y si debo comprobar la compatibilidad mono."

Inserta en el master, pulsa Nueva medicion y reproduce un pasaje de 30–60 segundos. El plugin conserva el audio sin cambios con ganancia 0 dB. Lee el pico de muestra, RMS, crest factor y correlacion; las mediciones son acumuladas desde el ultimo reinicio y ocurren ANTES de la ganancia propia. Pulsa Nueva medicion al cambiar de version o de seccion. Detener el transporte no reinicia el informe.

Muestras >= 0.999 indican proximidad a full scale; no demuestran distorsion. Un archivo ya recortado no se repara bajando la salida. Correlacion negativa requiere comprobar mono y contexto; no prueba una inversion incorrecta. Las alertas son reglas de nivel, no un juicio musical.

Para comparar una version mas fuerte con otra mas baja usa ganancia manual y bypass de ganancia; NO hay loudness matching automatico. Evita sumar ganancia positiva sin controlar los picos posteriores: no hay limitador protector. El host permite automatizar ganancia y bypass y guarda esos parametros en el proyecto.

## Alcance

- Entrada mono o estereo; procesamiento de ganancia con rampa de 20 ms.
- Sample peak, RMS sin ponderacion, crest factor y correlacion no centrada L/R.
- Analisis local sin subir audio, sin API, cuenta ni modelo conversacional.
- No mide LUFS, true peak ni LRA. No identifica frecuencias, notas, sibilancia o instrumentos.
- No tiene EQ, compresor, afinacion, edicion vocal, reconocimiento de genero, referencias ni comunicacion entre instancias.
- No controla plugins externos ni faders de FL Studio. Cada instancia analiza solo su entrada.

## Verificacion y siguientes versiones

El nucleo Meter.h tiene pruebas con seno de amplitud conocida, correlacion positiva/negativa, silencio, full scale y reset. Ver VALIDACION.md. El wrapper y GUI requieren compilar y probar en macOS antes de considerarse funcionales.

El siguiente incremento debe agregar captura por ventanas, espectro con evidencias y exportacion de informe; luego contexto entre pistas, EQ/compresion opcionales y comparacion de loudness. La IA conversacional necesita un motor e integracion adicionales.

## Dependencias y licencias

El codigo propio de este paquete se proporciona para uso y modificacion por el usuario, sin garantia. JUCE se descarga aparte: revisa https://juce.com/legal/juce-8-licence/ para elegir una licencia adecuada antes de distribuir un producto. Los SDK y dependencias conservan sus propias licencias. Este paquete no incluye JUCE ni concede derechos sobre dependencias externas.

Para desinstalar, cierra FL Studio y mueve solamente `~/Library/Audio/Plug-Ins/VST3/Mix Maestro.vst3` a la papelera. Las versiones anteriores se conservan como backups si el script las encuentra.
