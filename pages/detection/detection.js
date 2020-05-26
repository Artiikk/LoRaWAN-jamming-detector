document.addEventListener('DOMContentLoaded', () => {
  const storageData = {}
  let keys = Object.keys(localStorage);

  for(let key of keys) {
    storageData[key] = localStorage.getItem(key)
  }
  
  const socket = new WebSocket(`ws://localhost:8080/api/gateways/${storageData.gatewayId}/frames`, ['Bearer', storageData.token]);

  socket.addEventListener('open', () => console.log('opening connection'));

  let averageRSSI = 0;
  let RSSI_SUM = 0;
  let currentCount = 0;
  let lastDate = new Date();
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
              spreadingFactor
            }
          }
        }
      }
    } = JSON.parse(data);

    const { mhdr: { mType }, macPayload, mic } = JSON.parse(phyPayloadJSON);
    const { location: { latitude, longitude }, rssi, time } = rxObj;

    const newTime = new Date(time).getTime();
    const nextInterval = new Date(lastDate).getTime() + Number(storageData.interval * 1000);
    const notValidInterval = nextInterval > newTime;
    lastDate = new Date(time);
    
    currentCount += 1;
    RSSI_SUM += rssi;
    averageRSSI = Number((RSSI_SUM / currentCount).toFixed(1));
    
    const notValidRSSI = rssi > averageRSSI;

    const devAddr = macPayload.fhdr ? macPayload.fhdr.devAddr : macPayload.devEUI;
    const isValidAddr = (storageData.devAddr === devAddr) || (storageData.eui === devAddr);
    const notValidCheck = !isValidAddr && (notValidRSSI || notValidInterval);

    const item = `
      <li class='card ${notValidCheck && 'card-error'} uk-card uk-card-default uk-card-body uk-animation-slide-top uk-width-expand'>
        <a class='uk-accordion-title uk-card-title' href="#"><b>Device ${macPayload.fhdr ? 'address' : 'EUI'}</b>: ${devAddr}</a>
          <div class='uk-flex uk-flex-between uk-accordion-content'>
            <div class='accordion-data'>
              <p><b>Frequency</b>: ${frequency}</p>
              <p><b>Bandwith</b>: ${bandwidth} kHz</p>
              <p><b>Spreading Factor</b>: ${spreadingFactor}</p>
              <p><b>RSSI</b>: ${rssi}</p>
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

  const MIN = 60000;
  let retries = 0;
  const intervalId = setInterval(async () => {
    const newTime = new Date().getTime();
    const lastMessageInterval = new Date(lastDate).getTime() + (MIN * 2);
    retries += 1;

    if (newTime > lastMessageInterval) {
      const response = await fetch('http://localhost:8080/api/gateways?limit=1', {
        headers: new Headers({
          'Authorization': storageData.token,
          'Access-Control-Allow-Headers': 'access-control-allow-origin, authorization',
          'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, HEAD, OPTIONS',
          'Access-Control-Allow-Origin': '*',
        }),
      });

      const { result: [ gateway ] } = await response.json();

      const lastSeen = new Date(gateway.lastSeenAt).getTime();
      const gatewayIsOffline = Date.now() - lastSeen;

      // 10 retries max. to avoid infinite requests
      if (gatewayIsOffline > (MIN * 2) || retries >= 10) {
        const modal = `
          <div id="modal-center" class="uk-flex-top" uk-modal>
            <div class="uk-modal-dialog uk-modal-body uk-margin-auto-vertical">
              <button class="uk-modal-close-default" type="button" uk-close></button>
              <p style="text-align: center; font-size: 22px">Your gateway is not responding for more than 2 minutes. Check your connnection and try to reload the application.</p>
            </div>
          </div>`.trim();

        const body = document.querySelector('body');
        body.insertAdjacentHTML('afterbegin', modal);
        UIkit.modal(modal).show();

        socket.close();
        clearInterval(intervalId);
        console.log('Connection closed!');
      };
    };
  }, MIN);

  const closeConnection = (e) => e.wasClean ? `Closed correctly, code: ${event.code}, reason: ${event.reason}` : 'Connection closed';
  socket.addEventListener('close', closeConnection);
})