# Mix Maestro 0.2 — Apple Silicon / FL Studio

Instala el PKG con FL Studio cerrado. Conserva una copia de la version 0.1 si necesitas volver atras. La 0.2 usa la misma identidad VST3 y reemplaza el plugin instalado, conservando parametros gain/bypass de proyectos anteriores. El programa y paquete tienen firma ad hoc, no Developer ID ni notarizacion.

## Flujo

1. Inserta en un canal o master. Selecciona el rol y nombra la pista.
2. Pulsa Nueva seccion y reproduce 15–30 segundos de un pasaje representativo. Las mediciones acumulan desde ese momento; parar FL no las reinicia.
3. Lee IN/OUT sample peak, RMS sin ponderar, crest factor, GR, correlacion centrada y cambio de energia al plegar a mono. FFT 4096 con Hann muestra energia relativa en 64 bandas logaritmicas; no es una curva dBFS calibrada.
4. Capturar A conserva la entrada medida como referencia de esa instancia. Referencia WAV analiza un archivo local mono/estereo en segundo plano (WAV, AIFF, FLAC y formatos que soporte JUCE); no reproduce la referencia ni modifica el archivo. La linea naranja muestra su forma espectral normalizada. Ambos espectros se normalizan a su propio maximo: sirven para comparar forma, no volumen.
5. EQ activa cinco filtros bell con frecuencia, ganancia y Q. COMP activa compresion enlazada estereo, detector peak con HPF, knee, ratio, attack, release y makeup manual. Todo empieza desactivado y con ganancia 0. La mezcla wet y bypass DSP tienen rampa de 20 ms. Frecuencias/Q/coeficientes cambian por bloque: mueve controles lentamente y comprueba artefactos.
6. Igualar RMS acerca el nivel de salida al RMS global de la referencia con un limite basado en sample peak de -1 dBFS. Es una aproximacion, no loudness matching LUFS ni limitador. Debes usar secciones comparables y volver a medir. No garantiza true peak ni que futuros picos queden bajo el margen.
7. MONO es monitorizacion: tambien modifica el audio exportado mientras este activado. Bypass DSP conserva MONO si sigue activado; desactiva ambos para recuperar la senal original completa.
8. Exportar informe guarda un TXT con mediciones, eventos cercanos a full scale por segundo, parametros y otras instancias del mismo proceso. Los tiempos representan audio medido, no posiciones absolutas del timeline. Los eventos se limitan a los primeros 119 segundos por seccion.

## Evidencia y limites

El panel diferencia mediciones, candidatos y puntos iniciales. No escucha perceptualmente, no identifica instrumentos automaticamente ni confirma resonancias o sibilancia. La energia bajo 80 Hz y 5–10 kHz solo dispara candidatos. El pico FFT puede ser una nota musical. No recorta EQ automaticamente.

No mide LUFS, LRA o true peak. No hay limitador, de-esser, afinacion, reverb/delay, edicion vocal, sidechain externo, reproduccion de referencia, motor conversacional ni mastering automatico. Las recomendaciones se calculan localmente con reglas transparentes, no con un modelo IA.

El analisis usa un FIFO y un worker para que FFT, archivos, textos e inventario no bloqueen el hilo de audio. Durante el analisis largo de una referencia, el FIFO live puede llenarse y omitir muestras; se informa el contador. Espera a que termine y pulsa Nueva seccion. La cola de audio para analisis es fija; no se captura ni guarda tu audio completo.

Cada instancia publica un resumen en memoria dentro del mismo proceso para el inventario del informe. No hay alineacion temporal ni diagnostico de masking entre instancias; no funciona entre procesos aislados. Los parametros y nombre se guardan con el proyecto. Capturas de referencia y mediciones NO se guardan en el proyecto: exporta el informe y vuelve a cargar la referencia cuando sea necesario.

## Verificacion

Pruebas del nucleo: RMS, correlacion centrada, plegado mono, respuesta de bell -6 dB, rechazo DC de HPF, reduccion de compresion y recuperacion. Harness JUCE: senal neutral, FIFO/FFT, EQ finito, recall, bypass, mono, nueva seccion y construccion GUI. Se ejecutan en macOS antes del paquete. Tambien se verifica arquitectura arm64, firma e instalacion. El uso dentro de FL Studio requiere tu prueba en el host.

## Dependencias

JUCE 8.0.12 bajo sus propios terminos https://juce.com/legal/juce-8-licence/ . El codigo de Mix Maestro esta en la rama mix-maestro-installer de EM-RECORDS para uso y modificacion por el usuario. No se promete calidad musical, premios ni equivalencia con un ingeniero humano.
