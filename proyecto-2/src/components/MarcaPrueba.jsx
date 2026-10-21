// Sello de entorno de pruebas (HU-12): cinta fija bajo el mástil con el
// texto repetido en diagonal ascendente, animada en deriva lenta.
// aria-hidden: el aviso accesible lo dan la etiqueta «WEB TEST» del mástil
// y la nota del pie. No interfiere con clics (pointer-events: none).

export default function MarcaPrueba() {
  const texto = Array.from({ length: 14 }, () => 'WEB TEST - NOT FUNCION').join('  ·  ')

  return (
    <div className="cinta-teste" data-ui aria-hidden="true">
      {/* duplicado para que la deriva en bucle sea continua */}
      <span className="cinta-teste_marca">
        {texto}  ·  {texto}
      </span>
    </div>
  )
}
