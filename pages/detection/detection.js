document.addEventListener('DOMContentLoaded', () => {
  const storageData = {}
  let keys = Object.keys(localStorage);

  for(let key of keys) {
    storageData[key] = localStorage.getItem(key)
  }
  
  const socket = new WebSocket(`ws://localhost:8080/api/gateways/${storageData.gatewayId}/frames`, ['Bearer', storageData.token]);

  socket.addEventListener('open', () => console.log('opening connection'));

  socket.addEventListener('message', ({ data }) => {
    const parsedData = JSON.parse(data);
    const {
      result: {
        uplinkFrame: {
          phyPayloadJSON,
          rxInfo: [rxObj],
          txInfo: {
            frequency,
            loRaModulationInfo: {
              bandwidth,
              codeRate,
              spreadingFactor
          }
        }
      }
    }
  } = parsedData;

    const parsedPayload = JSON.parse(phyPayloadJSON);
    const { macPayload: { fhdr: { devAddr = '00000000' } }, mhdr: { mType }, macPayload: { devEUI }, mic } = parsedPayload;
    const { location: { latitude, longitude } } = rxObj;

    const isValid = (storageData.devAddr === devAddr || storageData.eui === devEUI);

    const item = `
      <li class='card ${!isValid && 'card-error'} uk-card uk-card-default uk-card-body uk-animation-slide-top uk-width-expand'>
        <a class='uk-accordion-title uk-card-title' href="#">Device address: ${devAddr}</a>
          <div class='uk-flex uk-flex-between uk-accordion-content'>
            <div class='accordion-data'>
              <p><b>Frequency</b>: ${frequency}</p>
              <p><b>Bandwith</b>: ${bandwidth} kHz</p>
              <p><b>Spreading Factor</b>: ${spreadingFactor}</p>
              <p><b>Code rate</b>: ${codeRate}</p>
              <p><b>mType</b>: ${mType}</p>
              <p><b>mic</b>: ${mic}</p>
            </div>
            <div id='map${mic}' class='map'></div>
          </div>
      </li>`.trim();

    const dataUL = document.querySelector('.data');
    dataUL.insertAdjacentHTML('afterbegin', item);

    const mymap = L.map(`map${mic}`).setView([latitude, longitude], 13);
    L.marker([latitude, longitude]).addTo(mymap);
    L.tileLayer(
      'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
      {
        attribution:
          "Map data &copy; <a href='https://www.openstreetmap.org/'>OpenStreetMap</a> contributors, <a href='https://creativecommons.org/licenses/by-sa/2.0/'>CC-BY-SA</a>, Imagery © <a href='https://www.mapbox.com/'>Mapbox</a>",
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken:
          'pk.eyJ1IjoiYXJ0aWlrazIiLCJhIjoiY2p5NGNnN3dvMTVlbjNjbXF6YndnY3dpdyJ9.fyu90Ocs8N7dcZchFop_Ow',
      },
    ).addTo(mymap);
  });

  const closeConnection = (e) => e.wasClean ? `Closed correctly, code: ${event.code}, reason: ${event.reason}` : 'Connection closed';
  socket.addEventListener('close', closeConnection);
})