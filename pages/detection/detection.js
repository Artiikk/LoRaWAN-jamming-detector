document.addEventListener('DOMContentLoaded', () => {
  const storageData = {}
  let keys = Object.keys(localStorage);

  for(let key of keys) {
    storageData[key] = localStorage.getItem(key)
  }
  
  const socket = new WebSocket(`ws://localhost:8080/api/gateways/${storageData.gatewayId}/frames`, ['Bearer', storageData.token]);

  socket.addEventListener('open', () => console.log('opening connection'));

  socket.addEventListener('message', ({ data }) => {
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
    } = JSON.parse(data);

    const { mhdr: { mType }, macPayload, mic } = JSON.parse(phyPayloadJSON);
    const { location: { latitude, longitude } } = rxObj;

    const devAddr = macPayload.fhdr ? macPayload.fhdr.devAddr : macPayload.devEUI;
    const isValid = (storageData.devAddr === devAddr || storageData.eui === devAddr);

    const item = `
      <li class='card ${!isValid && 'card-error'} uk-card uk-card-default uk-card-body uk-animation-slide-top uk-width-expand'>
        <a class='uk-accordion-title uk-card-title' href="#"><b>Device ${macPayload.fhdr ? 'address' : 'EUI'}</b>: ${devAddr}</a>
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