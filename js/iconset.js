/* ==========================================================================
   Repertorio de iconos: emojis por categoría (con nombres para buscar) y
   una familia de iconos de línea monocromos que admiten color, como los de
   Notion. Los iconos de línea se guardan como «ico:nombre:color».
   ========================================================================== */
const IconSet = (() => {
  /* ------------------------------- Emojis --------------------------------
     Cada entrada es «emoji nombre nombre…»: el nombre sirve para el buscador. */
  const EMOJI_CATS = [
    { id: "frecuentes", name: "Frecuentes", icon: "🕘", list: `
      ✅ visto hecho|📌 chincheta fijar|🔥 fuego|✨ brillo|🚀 cohete lanzamiento|💡 idea bombilla
      📝 nota escribir|📅 calendario|🎯 objetivo diana|⚡ rayo rapido|🧠 cerebro idea|🏆 trofeo premio
      💼 maletin trabajo|📊 grafica datos|🔒 candado privado|🎬 claqueta video|🎨 arte diseno|❤️ corazon` },
    { id: "caras", name: "Caras y personas", icon: "😀", list: `
      😀 sonrisa feliz|😃 alegre|😄 risa|😁 sonrisa dientes|😅 sudor risa|😂 llorar risa|🙂 leve sonrisa
      😊 rubor feliz|😇 angel|🥰 enamorado|😍 ojos corazon|🤩 estrellas|😘 beso|😗 beso|🤗 abrazo
      🤔 pensando duda|🤨 ceja|😐 neutral|😑 sin expresion|🙄 ojos arriba|😴 dormido|🤤 baba|😪 sueno
      😎 gafas genial|🤓 nerd|🧐 monoculo|😕 confundido|😟 preocupado|🙁 triste|☹️ triste|😮 sorpresa
      😯 asombro|😲 impacto|😳 sonrojo|🥺 suplica|😦 miedo|😧 angustia|😨 susto|😰 nervios|😥 alivio triste
      😢 llanto|😭 llorar|😱 grito|😖 frustrado|😣 esfuerzo|😞 decepcion|😓 sudor|😩 cansado|😫 agotado
      🥱 bostezo|😤 enfado vapor|😡 enfadado|🤬 palabrotas|🤯 explota mente|😶 sin boca|😬 mueca|🤐 cremallera
      🤕 herido|🤒 enfermo|🤢 nausea|🤮 vomito|🥵 calor|🥶 frio|😵 mareo|🤠 vaquero|🥳 fiesta|🥸 disfraz
      😈 diablillo|👻 fantasma|💀 calavera|👽 alien|🤖 robot|🎃 calabaza|👶 bebe|🧒 nino|👦 chico|👧 chica
      🧑 persona|👨 hombre|👩 mujer|🧔 barba|👴 abuelo|👵 abuela|🙋 mano arriba|🙆 vale|🙅 no|🤷 encogerse
      💁 informacion|🙇 reverencia|🧑‍💻 programador|👩‍💻 programadora|🧑‍🎨 artista|🧑‍🏫 profesor|🧑‍🍳 cocinero
      🕵️ detective|💂 guardia|👷 obrero|🤴 principe|👸 princesa|🦸 superheroe|🦹 villano|🧙 mago|🧚 hada
      👫 pareja|👪 familia|🤝 acuerdo manos|👏 aplausos|🙌 celebrar|👍 bien pulgar|👎 mal pulgar|✌️ paz
      🤞 suerte dedos|🤘 rock|👌 ok|🤙 llamame|👈 izquierda|👉 derecha|👆 arriba|👇 abajo|✋ mano|🖐️ mano
      ✊ puno|👊 golpe|🙏 gracias rezar|💪 fuerza musculo|🦾 brazo robot|👀 ojos mirar|👁️ ojo|🧠 cerebro
      🫀 corazon organo|🦷 diente|👂 oreja|👃 nariz|👄 boca|🦴 hueso` },
    { id: "naturaleza", name: "Naturaleza", icon: "🌿", list: `
      🐶 perro|🐱 gato|🐭 raton|🐹 hamster|🐰 conejo|🦊 zorro|🐻 oso|🐼 panda|🐨 koala|🐯 tigre|🦁 leon
      🐮 vaca|🐷 cerdo|🐸 rana|🐵 mono|🐔 gallina|🐧 pinguino|🐦 pajaro|🦅 aguila|🦉 buho|🦇 murcielago
      🐺 lobo|🐗 jabali|🐴 caballo|🦄 unicornio|🐝 abeja|🐛 gusano|🦋 mariposa|🐌 caracol|🐞 mariquita bug
      🐜 hormiga|🕷️ arana|🦂 escorpion|🐢 tortuga|🐍 serpiente|🦎 lagarto|🐙 pulpo|🦑 calamar|🦀 cangrejo
      🐠 pez|🐟 pez|🐬 delfin|🐳 ballena|🦈 tiburon|🐊 cocodrilo|🐅 tigre|🦓 cebra|🦍 gorila|🐘 elefante
      🦏 rinoceronte|🐫 camello|🦒 jirafa|🐃 bufalo|🐑 oveja|🐐 cabra|🦌 ciervo|🐕 perro|🐈 gato|🦜 loro
      🦢 cisne|🦩 flamenco|🕊️ paloma|🐇 conejo|🦝 mapache|🦔 erizo|🌲 arbol pino|🌳 arbol|🌴 palmera
      🌵 cactus|🌾 espiga|🌿 hoja hierba|☘️ trebol|🍀 trebol suerte|🍁 hoja otono|🍂 hojas|🍃 viento hoja
      🌱 brote planta|🌷 tulipan|🌹 rosa|🌺 flor|🌸 sakura|🌼 margarita|🌻 girasol|🌞 sol|🌝 luna|🌚 luna
      🌛 luna|🌜 luna|🌙 luna noche|⭐ estrella|🌟 estrella brillo|💫 mareo estrella|✨ destellos
      ☀️ sol soleado|🌤️ nubes sol|⛅ nublado|☁️ nube|🌧️ lluvia|⛈️ tormenta|🌩️ rayo|❄️ nieve copo
      ☃️ muneco nieve|🌊 ola mar|🔥 fuego llama|💧 gota agua|🌈 arcoiris|🌍 mundo tierra|🌎 mundo|🌏 mundo
      🪐 planeta|🌋 volcan|🏔️ montana|⛰️ montana|🏕️ camping|🏖️ playa|🏜️ desierto|🏝️ isla` },
    { id: "comida", name: "Comida", icon: "🍎", list: `
      🍎 manzana|🍏 manzana verde|🍐 pera|🍊 naranja|🍋 limon|🍌 platano|🍉 sandia|🍇 uvas|🍓 fresa
      🫐 arandano|🍒 cereza|🍑 melocoton|🥭 mango|🍍 pina|🥥 coco|🥝 kiwi|🍅 tomate|🥑 aguacate
      🥦 brocoli|🥕 zanahoria|🌽 maiz|🌶️ chile|🥔 patata|🍠 batata|🧄 ajo|🧅 cebolla|🍞 pan|🥐 croissant
      🥖 baguette|🧀 queso|🥚 huevo|🍳 huevo frito|🥞 tortitas|🧇 gofre|🥓 bacon|🍔 hamburguesa
      🍟 patatas fritas|🍕 pizza|🌭 perrito|🥪 sandwich|🌮 taco|🌯 burrito|🥗 ensalada|🍝 pasta|🍜 ramen
      🍣 sushi|🍤 gamba|🍚 arroz|🍲 guiso|🍛 curry|🥘 paella|🍱 bento|🍦 helado|🍩 donut|🍪 galleta
      🎂 tarta cumple|🍰 tarta|🧁 magdalena|🍫 chocolate|🍬 caramelo|🍭 piruleta|🍯 miel|🥛 leche
      ☕ cafe|🍵 te|🧋 bubble tea|🥤 refresco|🧃 zumo|🍺 cerveza|🍻 brindis|🍷 vino|🥂 champan|🍸 cóctel
      🧊 hielo|🍽️ plato cubiertos|🥄 cuchara|🔪 cuchillo` },
    { id: "actividad", name: "Actividad y viajes", icon: "⚽", list: `
      ⚽ futbol|🏀 baloncesto|🏈 futbol americano|⚾ beisbol|🎾 tenis|🏐 voleibol|🏉 rugby|🎱 billar
      🏓 ping pong|🏸 badminton|🥊 boxeo|🥋 artes marciales|⛳ golf|🏹 arco tiro|🎣 pesca|🤿 buceo
      🏊 natacion|🏄 surf|🚴 ciclismo|🚵 montana bici|🏋️ pesas gimnasio|🤸 gimnasia|⛷️ esqui|🏂 snowboard
      🏆 trofeo|🥇 oro medalla|🥈 plata|🥉 bronce|🎖️ medalla|🏅 medalla|🎯 diana objetivo|🎮 videojuego
      🕹️ joystick|🎲 dado|♟️ ajedrez|🧩 puzzle pieza|🎰 tragaperras|🎪 circo|🎭 teatro|🎨 arte paleta
      🎬 cine claqueta|🎤 microfono|🎧 auriculares|🎼 partitura|🎵 musica nota|🎶 musica|🎹 piano
      🥁 bateria|🎷 saxo|🎺 trompeta|🎸 guitarra|🎻 violin|🚗 coche|🚕 taxi|🚙 todoterreno|🚌 autobus
      🚎 trolebus|🏎️ carreras|🚓 policia|🚑 ambulancia|🚒 bomberos|🚚 camion|🚛 trailer|🚜 tractor
      🛵 scooter|🏍️ moto|🚲 bicicleta|🛴 patinete|🚂 tren|🚆 tren|🚇 metro|🚊 tranvia|🚁 helicoptero
      ✈️ avion|🛫 despegue|🛬 aterrizaje|🚀 cohete|🛸 ovni|⛵ velero|🚤 lancha|🛳️ crucero|⚓ ancla
      🗽 estatua libertad|🗼 torre|🏰 castillo|🎡 noria|🎢 montana rusa|🎠 carrusel|⛲ fuente|🗺️ mapa` },
    { id: "objetos", name: "Objetos", icon: "💡", list: `
      💡 idea bombilla|🔦 linterna|🕯️ vela|🧯 extintor|🛢️ barril|💸 dinero vuela|💵 billete|💴 yen|💶 euro
      💷 libra|💰 dinero bolsa|💳 tarjeta|🧾 recibo factura|💎 diamante|⚖️ balanza justicia|🔧 llave inglesa
      🔨 martillo|⚒️ herramientas|🛠️ herramientas|⛏️ pico|🔩 tornillo|⚙️ engranaje ajustes|🧰 caja herramientas
      🧲 iman|🔫 pistola agua|🧪 probeta laboratorio|🧫 placa petri|🧬 adn|🔬 microscopio|🔭 telescopio
      📡 antena satelite|💉 jeringa|💊 pastilla|🩹 tirita|🩺 estetoscopio|🚪 puerta|🛏️ cama|🛋️ sofa
      🚽 baño|🚿 ducha|🛁 banera|🧴 bote|🧷 imperdible|🧹 escoba|🧺 cesta|🧻 papel|🧼 jabon|🪣 cubo
      🔑 llave|🗝️ llave antigua|🔒 candado cerrado|🔓 candado abierto|🔐 seguridad|🛡️ escudo proteccion
      ⏰ alarma reloj|⏱️ cronometro|⏳ reloj arena|⌛ tiempo|🕰️ reloj|📱 movil|💻 portatil|🖥️ ordenador
      🖨️ impresora|⌨️ teclado|🖱️ raton|💾 disquete guardar|💿 disco|📀 dvd|🎥 camara video|📷 camara foto
      📸 foto flash|📹 videocamara|📺 television|📻 radio|☎️ telefono|📞 llamada|📟 busca|📠 fax
      🔋 bateria|🔌 enchufe|💈 barberia|🪒 cuchilla afeitar|✂️ tijeras|🧵 hilo|🧶 lana|👕 camiseta
      👔 corbata|👗 vestido|👠 tacon|👟 zapatilla|🎩 sombrero|👑 corona|🕶️ gafas sol|👓 gafas|💍 anillo
      🎁 regalo|🎈 globo|🎉 fiesta confeti|🎊 confeti|🎀 lazo|🏮 farolillo|🪔 lampara` },
    { id: "trabajo", name: "Trabajo y oficina", icon: "💼", list: `
      💼 maletin trabajo|📁 carpeta|📂 carpeta abierta|🗂️ archivador|📅 calendario|📆 calendario
      🗓️ planificador|📇 fichero|📈 grafica sube|📉 grafica baja|📊 grafica barras|📋 portapapeles
      📌 chincheta|📍 ubicacion pin|📎 clip|🖇️ clips|📏 regla|📐 escuadra|✂️ tijeras|🗃️ cajon fichas
      🗄️ archivador|🗑️ papelera|📝 nota escribir|✏️ lapiz|🖊️ boligrafo|🖋️ pluma|🖌️ pincel|🖍️ cera
      📖 libro abierto|📚 libros|📓 cuaderno|📔 libreta|📒 libreta|📕 libro|📗 libro|📘 libro|📙 libro
      🔖 marcador|🏷️ etiqueta|📰 periodico|🗞️ noticias|📄 documento|📃 pagina|📑 marcadores|🧾 factura
      ✉️ sobre correo|📧 email|📨 mensaje|📩 entrada|📤 enviar|📥 recibir|📦 paquete caja|📫 buzon
      📮 buzon correo|🏢 oficina edificio|🏬 tienda|🏭 fabrica|🏦 banco|🏫 escuela|🏥 hospital|🏨 hotel
      🏪 tienda 24h|🏛️ institucion|⛪ iglesia|🕌 mezquita|🏗️ construccion|🏠 casa|🏡 hogar|🖇️ adjuntar` },
    { id: "simbolos", name: "Símbolos", icon: "✅", list: `
      ✅ hecho visto|☑️ casilla marcada|✔️ correcto|❌ error cruz|❎ no|⭕ circulo|🚫 prohibido|⛔ prohibido
      ⚠️ aviso peligro|❗ importante|❕ exclamacion|❓ pregunta duda|❔ pregunta|💤 dormir|💢 enfado
      💥 explosion|💫 mareo|💦 gotas|💨 viento prisa|🕳️ agujero|💬 comentario bocadillo|🗨️ mensaje
      🗯️ grito|💭 pensamiento|🔔 campana aviso|🔕 silencio|📢 altavoz anuncio|📣 megafono|📯 corneta
      🔇 mudo|🔈 volumen|🔉 volumen|🔊 volumen alto|🔍 buscar lupa|🔎 buscar|🔗 enlace|⛓️ cadena
      ➕ mas sumar|➖ menos|✖️ por|➗ dividir|♾️ infinito|💲 dolar|💱 cambio|™️ marca|©️ copyright
      ®️ registrado|〰️ onda|🔺 triangulo|🔻 triangulo|🔴 rojo|🟠 naranja|🟡 amarillo|🟢 verde|🔵 azul
      🟣 morado|⚫ negro|⚪ blanco|🟤 marron|🟥 cuadro rojo|🟧 cuadro naranja|🟨 cuadro amarillo
      🟩 cuadro verde|🟦 cuadro azul|🟪 cuadro morado|⬛ negro|⬜ blanco|🔶 rombo|🔷 rombo|🔸 rombo
      🔹 rombo|🔘 boton|🔱 tridente|⚜️ flor lis|🔰 principiante|♻️ reciclar|✳️ asterisco|❇️ destello
      ⭐ estrella|🌟 estrella|💯 cien|🆗 ok|🆕 nuevo|🆓 gratis|🆙 arriba|🔝 top|🔙 atras|🔜 pronto
      🔛 activo|🔃 recargar|🔄 actualizar|▶️ reproducir|⏸️ pausa|⏹️ parar|⏺️ grabar|⏭️ siguiente
      ⏮️ anterior|⏩ avanzar|⏪ retroceder|⤴️ subir|⤵️ bajar|↗️ diagonal|↘️ diagonal|⬆️ arriba
      ⬇️ abajo|⬅️ izquierda|➡️ derecha|🔀 aleatorio|🔁 repetir|❤️ corazon rojo|🧡 naranja|💛 amarillo
      💚 verde|💙 azul|💜 morado|🖤 negro|🤍 blanco|🤎 marron|💔 roto|❣️ corazon|💕 corazones|💖 brillo
      💗 latido|💘 flecha|💝 regalo corazon|☮️ paz|🕉️ om|☯️ yin yang|⚛️ atomo|🔯 estrella|♈ aries
      ♉ tauro|♊ geminis|♋ cancer|♌ leo|♍ virgo|♎ libra|♏ escorpio|♐ sagitario|♑ capricornio
      ♒ acuario|♓ piscis|⛎ ofiuco` },
    { id: "banderas", name: "Banderas", icon: "🏳️", list: `
      🏁 meta carrera|🚩 bandera marca|🎌 banderas|🏴 negra|🏳️ blanca|🏳️‍🌈 arcoiris orgullo|🏴‍☠️ pirata
      🇪🇸 espana|🇲🇽 mexico|🇦🇷 argentina|🇨🇴 colombia|🇨🇱 chile|🇵🇪 peru|🇺🇾 uruguay|🇻🇪 venezuela
      🇪🇨 ecuador|🇧🇴 bolivia|🇵🇾 paraguay|🇨🇷 costa rica|🇵🇦 panama|🇩🇴 republica dominicana|🇨🇺 cuba
      🇺🇸 estados unidos|🇨🇦 canada|🇧🇷 brasil|🇬🇧 reino unido|🇫🇷 francia|🇩🇪 alemania|🇮🇹 italia
      🇵🇹 portugal|🇳🇱 paises bajos|🇸🇪 suecia|🇳🇴 noruega|🇩🇰 dinamarca|🇫🇮 finlandia|🇵🇱 polonia
      🇷🇺 rusia|🇨🇳 china|🇯🇵 japon|🇰🇷 corea|🇮🇳 india|🇦🇺 australia|🇳🇿 nueva zelanda|🇿🇦 sudafrica
      🇲🇦 marruecos|🇪🇬 egipto|🇹🇷 turquia|🇬🇷 grecia|🇮🇪 irlanda|🇨🇭 suiza|🇦🇹 austria|🇧🇪 belgica` },
  ].map((c) => ({
    ...c,
    items: c.list.trim().split(/\s*\|\s*|\n\s*/).filter(Boolean).map((raw) => {
      const [char, ...words] = raw.trim().split(/\s+/);
      return { char, words: words.join(" ") };
    }),
  }));

  const ALL_EMOJI = EMOJI_CATS.flatMap((c) => c.items);

  /* --------------------------- Iconos de línea ----------------------------
     Cada icono es el interior de un <svg viewBox="0 0 24 24">; el trazo y el
     color los pone el contenedor, así que admiten los colores de Notion. */
  const P = (d) => `<path d="${d}"/>`;
  const C = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
  const R = (x, y, w, h, r = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
  const L = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}"/>`;

  const LINE_CATS = [
    {
      id: "trabajo", name: "Trabajo",
      icons: {
        documento: P("M6 3h8l4 4v14H6z") + P("M14 3v4h4"),
        carpeta: P("M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"),
        maletin: R(3, 7, 18, 13, 2) + P("M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2") + L(3, 12, 21, 12),
        calendario: R(3, 5, 18, 16, 2) + L(3, 10, 21, 10) + L(8, 3, 8, 7) + L(16, 3, 16, 7),
        tarea: R(3, 4, 18, 17, 2) + P("M8 12l3 3 5-6"),
        lista: L(8, 7, 20, 7) + L(8, 12, 20, 12) + L(8, 17, 20, 17) + C(4.5, 7, 1) + C(4.5, 12, 1) + C(4.5, 17, 1),
        tabla: R(3, 4, 18, 16, 2) + L(3, 10, 21, 10) + L(9, 4, 9, 20),
        tablero: R(3, 4, 18, 16, 2) + L(9, 4, 9, 20) + L(15, 4, 15, 20),
        grafica: L(4, 20, 20, 20) + P("M7 17v-5") + P("M12 17V8") + P("M17 17v-8"),
        tendencia: P("M4 16l5-5 4 4 7-8") + P("M15 7h5v5"),
        objetivo: C(12, 12, 8) + C(12, 12, 4) + C(12, 12, 1),
        reloj: C(12, 12, 8) + P("M12 8v4l3 2"),
        cronometro: C(12, 13, 7) + L(9, 3, 15, 3) + L(12, 3, 12, 6),
        aprobado: C(12, 12, 9) + P("M8 12.5l2.5 2.5L16 9.5"),
        bloqueado: R(5, 11, 14, 9, 2) + P("M8 11V8a4 4 0 0 1 8 0v3"),
        equipo: C(9, 9, 3) + P("M3 20a6 6 0 0 1 12 0") + P("M16 7.5a3 3 0 0 1 0 5.8") + P("M17 20a5.5 5.5 0 0 0-2-4.3"),
        persona: C(12, 8, 3.5) + P("M5 20a7 7 0 0 1 14 0"),
        reunion: R(3, 6, 14, 10, 2) + P("M17 10l4-2.5v9L17 14"),
        firma: P("M4 17c4 0 4-9 7-9s3 9 6 9h3") + L(4, 20, 20, 20),
        premio: C(12, 9, 5) + P("M9 13l-2 8 5-3 5 3-2-8"),
      },
    },
    {
      id: "interfaz", name: "Interfaz",
      icons: {
        casa: P("M4 11l8-7 8 7") + P("M6 10v10h12V10"),
        buscar: C(11, 11, 6) + L(16, 16, 21, 21),
        ajustes: C(12, 12, 3) + P("M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M18.4 5.6l-2 2M7.6 16.4l-2 2"),
        filtro: P("M4 5h16l-6 7v6l-4 2v-8z"),
        orden: P("M7 4v14M4 15l3 3 3-3") + P("M17 20V6M14 9l3-3 3 3"),
        mas: L(12, 5, 12, 19) + L(5, 12, 19, 12),
        menos: L(5, 12, 19, 12),
        cerrar: L(6, 6, 18, 18) + L(18, 6, 6, 18),
        menu: L(4, 7, 20, 7) + L(4, 12, 20, 12) + L(4, 17, 20, 17),
        opciones: C(12, 5, 1.3) + C(12, 12, 1.3) + C(12, 19, 1.3),
        expandir: P("M9 4H4v5M20 15v5h-5M4 4l6 6M20 20l-6-6"),
        contraer: P("M4 9h5V4M15 20v-5h5M4 4l5 5M20 20l-5-5"),
        actualizar: P("M20 12a8 8 0 1 1-2.3-5.6") + P("M20 4v4h-4"),
        guardar: P("M5 5h11l3 3v11H5z") + P("M9 5v5h6V5") + R(8, 13, 8, 6, 1),
        descargar: P("M12 4v10") + P("M8 11l4 4 4-4") + P("M5 19h14"),
        subir: P("M12 20V10") + P("M8 13l4-4 4 4") + P("M5 5h14"),
        enlace: P("M10 14a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 1 0-5.7-5.7L11 7.3") + P("M14 10a4 4 0 0 0-5.7 0L6 12.3a4 4 0 1 0 5.7 5.7L13 16.7"),
        ojo: P("M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z") + C(12, 12, 2.6),
        estrella: P("M12 4l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z"),
        corazon: P("M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z"),
        campana: P("M6 16V11a6 6 0 1 1 12 0v5l2 3H4z") + P("M10 22h4"),
      },
    },
    {
      id: "media", name: "Media y creación",
      icons: {
        imagen: R(3, 5, 18, 14, 2) + C(8.5, 10, 1.6) + P("M4 17l5-5 4 4 3-2 4 4"),
        camara: P("M4 8h3l2-2h6l2 2h3v11H4z") + C(12, 13, 3.4),
        video: R(3, 6, 12, 12, 2) + P("M15 11l6-3v8l-6-3"),
        claqueta: R(3, 7, 18, 13, 2) + P("M3 11h18") + P("M7 7l2 4M12 7l2 4"),
        musica: P("M9 18V6l10-2v12") + C(7, 18, 2) + C(17, 16, 2),
        microfono: R(9.5, 3, 5, 10, 2.5) + P("M6 11a6 6 0 0 0 12 0") + L(12, 17, 12, 21),
        auriculares: P("M5 14v-2a7 7 0 0 1 14 0v2") + R(3, 13, 4, 6, 2) + R(17, 13, 4, 6, 2),
        paleta: P("M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3 3h-2a2 2 0 0 0-1 3.7A2 2 0 0 1 12 21z") + C(8, 10, 1.1) + C(12, 7.5, 1.1) + C(16, 10, 1.1),
        pincel: P("M15 4l5 5-8 8H7v-5z") + L(5, 21, 9, 17),
        lapiz: P("M4 20h4L20 8l-4-4L4 16z") + L(14, 6, 18, 10),
        tijeras: C(7, 18, 2.4) + C(7, 6, 2.4) + L(9, 7, 20, 18) + L(9, 17, 20, 6),
        capas: P("M12 3l9 5-9 5-9-5z") + P("M3 13l9 5 9-5") + P("M3 17l9 5 9-5"),
        recortar: P("M6 2v16h16") + P("M2 6h16v16"),
        texto: P("M5 6V4h14v2") + L(12, 4, 12, 20) + L(9, 20, 15, 20),
        codigo: P("M9 8l-5 4 5 4") + P("M15 8l5 4-5 4"),
        terminal: R(3, 5, 18, 14, 2) + P("M7 10l3 2-3 2") + L(12, 14, 17, 14),
      },
    },
    {
      id: "negocio", name: "Negocio y datos",
      icons: {
        dinero: C(12, 12, 8) + P("M12 8v8") + P("M14.5 10a2.5 2.5 0 0 0-5 0c0 3 5 1 5 4a2.5 2.5 0 0 1-5 0"),
        tarjeta: R(3, 6, 18, 12, 2) + L(3, 10, 21, 10),
        carrito: P("M4 5h2l2.5 10h9L20 8H7") + C(9.5, 19, 1.4) + C(17, 19, 1.4),
        etiqueta: P("M3 11V5a2 2 0 0 1 2-2h6l10 10-8 8z") + C(8, 8, 1.3),
        caja: P("M4 8l8-4 8 4v9l-8 4-8-4z") + P("M4 8l8 4 8-4M12 12v9"),
        camion: R(2, 7, 12, 9, 1.5) + P("M14 10h4l3 3v3h-7") + C(7, 18, 1.8) + C(17, 18, 1.8),
        tienda: P("M4 9h16v11H4z") + P("M3 9l2-4h14l2 4") + P("M9 20v-6h6v6"),
        edificio: R(5, 3, 14, 18, 2) + L(9, 7, 9, 7) + P("M9 7h0M15 7h0M9 11h0M15 11h0M9 15h0M15 15h0") + P("M10 21v-3h4v3"),
        factura: P("M6 3h12v18l-3-2-3 2-3-2-3 2z") + L(9, 8, 15, 8) + L(9, 12, 15, 12),
        embudo: P("M3 4h18l-7 8v8l-4-2v-6z"),
        idea: P("M9 18h6") + P("M10 21h4") + P("M12 3a6 6 0 0 1 4 10.5V16H8v-2.5A6 6 0 0 1 12 3z"),
        cohete: P("M12 3c3 2 5 5.5 5 9l-3 3H10l-3-3c0-3.5 2-7 5-9z") + C(12, 10, 1.6) + P("M9 16l-2 5 4-2M15 16l2 5-4-2"),
        rayo: P("M13 3L5 14h6l-1 7 8-11h-6z"),
        escudo: P("M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z") + P("M9 12l2 2 4-4"),
        global: C(12, 12, 9) + P("M3 12h18") + P("M12 3c4 4.5 4 13.5 0 18-4-4.5-4-13.5 0-18z"),
        enviar: P("M21 3L3 10.5l7 3 3 7z") + L(10, 13.5, 21, 3),
      },
    },
    {
      id: "vida", name: "Vida y lugares",
      icons: {
        cafe: P("M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z") + P("M16 9h2a2.5 2.5 0 0 1 0 5h-2") + L(6, 3, 6, 5) + L(10, 3, 10, 5),
        comida: P("M6 3v8a2 2 0 0 0 4 0V3") + L(8, 11, 8, 21) + P("M16 3c2 0 3 2 3 5s-1 4-2 4v9"),
        planta: P("M12 21v-8") + P("M12 13c-4 0-6-2-6-6 4 0 6 2 6 6z") + P("M12 13c0-3 2-5 6-5 0 3-2 5-6 5z"),
        mascota: C(12, 14, 4) + C(7, 8, 1.8) + C(17, 8, 1.8) + C(4.5, 12, 1.5) + C(19.5, 12, 1.5),
        mapa: P("M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z") + L(9, 4, 9, 18) + L(15, 6, 15, 20),
        ubicacion: P("M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z") + C(12, 10, 2.6),
        avion: P("M10 4l2-1 2 1v7l7 4v2l-7-2v4l2 2v1l-4-1-4 1v-1l2-2v-4l-7 2v-2l7-4z"),
        cama: P("M3 18v-7h13a4 4 0 0 1 4 4v3") + L(3, 11, 3, 6) + C(7.5, 10, 2),
        deporte: C(12, 12, 8) + P("M12 4c3 3 3 13 0 16M4.5 9h15M4.5 15h15"),
        libro: P("M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z") + P("M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z"),
        salud: P("M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z") + P("M8 12h2l1.5-2 1.5 4 1.5-2H17"),
        sol: C(12, 12, 4) + P("M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2 2M17.1 17.1l2 2M19.1 4.9l-2 2M6.9 17.1l-2 2"),
        luna: P("M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10z"),
        fuego: P("M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-5 .5 2 1.5 2.5 2 2 .8-.8 1-4 1-6z"),
        montana: P("M3 19l6-10 4 6 2-3 6 7z"),
        tijera: C(7, 18, 2.4) + C(7, 6, 2.4) + L(9, 7, 20, 18) + L(9, 17, 20, 6),
      },
    },
    {
      id: "flechas", name: "Flechas y formas",
      icons: {
        arriba: L(12, 20, 12, 5) + P("M6 11l6-6 6 6"),
        abajo: L(12, 4, 12, 19) + P("M6 13l6 6 6-6"),
        izquierda: L(20, 12, 5, 12) + P("M11 6l-6 6 6 6"),
        derecha: L(4, 12, 19, 12) + P("M13 6l6 6-6 6"),
        volver: P("M9 7L4 12l5 5") + P("M4 12h11a5 5 0 0 1 0 10"),
        repetir: P("M4 9h12a4 4 0 0 1 0 8H8") + P("M7 6l-3 3 3 3"),
        intercambiar: P("M7 8h13l-3-3") + P("M17 16H4l3 3"),
        circulo: C(12, 12, 8),
        cuadrado: R(4, 4, 16, 16, 3),
        triangulo: P("M12 4l9 16H3z"),
        rombo: P("M12 3l9 9-9 9-9-9z"),
        hexagono: P("M8 3h8l4 9-4 9H8l-4-9z"),
        punto: C(12, 12, 4),
        marca: P("M5 13l5 5L20 6"),
        cruz: L(6, 6, 18, 18) + L(18, 6, 6, 18),
        infinito: P("M8.5 9a3 3 0 1 0 0 6c3 0 4-6 7-6a3 3 0 1 1 0 6c-3 0-4-6-7-6z"),
      },
    },
  ];

  const LINE_INDEX = LINE_CATS.flatMap((c) =>
    Object.keys(c.icons).map((name) => ({ name, cat: c.id, body: c.icons[name] }))
  );

  const COLORS = [
    ["default", "Predeterminado"], ["gray", "Gris"], ["brown", "Marrón"], ["orange", "Naranja"],
    ["yellow", "Amarillo"], ["green", "Verde"], ["blue", "Azul"], ["purple", "Morado"],
    ["pink", "Rosa"], ["red", "Rojo"],
  ];

  /** Devuelve el SVG de un icono de línea, o null si no existe. */
  function lineSvg(name, size = 20) {
    const def = LINE_INDEX.find((i) => i.name === name);
    if (!def) return null;
    return `<svg class="line-icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none"
      stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${def.body}</svg>`;
  }

  /** «ico:nombre:color» → { name, color } */
  function parse(value = "") {
    if (!String(value).startsWith("ico:")) return null;
    const [, name, color = "default"] = String(value).split(":");
    return { name, color };
  }

  const randomEmoji = () => ALL_EMOJI[Math.floor(Math.random() * ALL_EMOJI.length)].char;

  return { EMOJI_CATS, ALL_EMOJI, LINE_CATS, LINE_INDEX, COLORS, lineSvg, parse, randomEmoji };
})();
