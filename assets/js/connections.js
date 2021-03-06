import React, { useState, useEffect } from 'react';
const delay = (timeout)=> new Promise((resolve)=> setTimeout(resolve, timeout));

async function load() {
  const response = await fetch("/api/connections");
  const json = await response.json();
  if(!json.error) return json.data;
  let err = new Error(json.message);
  err.data = json.data;
  throw err;
}

async function refresh(interfaceName) {
  const response = await fetch(`/api/connections/refresh/${interfaceName}`, { method: 'post' });
  const json = await response.json();
  if(!json.error) return;
  let err = new Error(json.message);
  err.data = json.data;
  throw err;
}

async function prefer(interfaceName) {
  const response = await fetch(`/api/connections/prefer/${interfaceName}`, { method: 'post' });
  const json = await response.json();
  await delay(2 * 1000); // Give a few seconds for the router to switch connections
  if(!json.error) return;
  let err = new Error(json.message);
  err.data = json.data;
  throw err;
}

function swallowError(promise) {
  promise.catch((err)=> console.error(err));
}

export default function Connections() {
  const [ loading, setLoading ] = useState(true);
  const [ error, setError ] = useState(null);
  const [ connections, setConnections ] = useState([]);
  const [ pollData, setPollData ] = useState(true);

  const loadConnections = ()=> {
    load()
      .then(connections=> setConnections(connections))
      .catch((err)=> setError(err))
      .finally(()=> setLoading(false));
  }

  const markPreferred = (connection)=> {
    setConnections((connections)=> {
      connections.forEach(c=> c.preferred = false); // Remove preferred from all connections
      connections.forEach(c=> c.active = false); // Remove active from all connections
      connection.preferred = true; // mark the connection as preferred
      connection.active = true; // mark the connection as active
      return connections;
    });
  }

  // Load connections on mount
  useEffect(()=> loadConnections(), []);

  // Reload data every 2 seconds
  useEffect(()=> {
    if(!pollData) return;
    const interval = setInterval(loadConnections, 2 * 1000);
    return ()=> clearInterval(interval);
  }, [pollData]);

  const renderError = ()=> (
    <div className="Connections__error">
      { error.message }
    </div>
  );

  const renderLoading = ()=> (
    <div className="Connections__loading">
      ...
    </div>
  );

  const renderConnections = ()=> (
    connections.map(connection => (
      <Connection
        key={connection.interfaceName}
        interfaceName={connection.interfaceName}
        running={connection.running}
        disabled={connection.disabled}
        active={connection.active}
        preferred={connection.preferred}
        onRefresh={()=> {
          swallowError(
            refresh(connection.interfaceName)
              .finally(()=> loadConnections())
          );
        }}
        onPrefer={()=> {
          setPollData(false); // Pause polling while requesting the server
          markPreferred(connection); // Mark as preferred before requesting the server for snappier transition
          swallowError(
            prefer(connection.interfaceName)
              .finally(()=> {
                loadConnections();
                setPollData(true);  // Restart polling
              })
          );
        }}
      />
    ))
  );

  return (
    <div className="Connections">
      { error ? renderError() : null }
      { loading ? renderLoading() : null }
      { !(error || loading) ? renderConnections() : null }
    </div>
  );
}

function Connection({ interfaceName, running, disabled, active, preferred, onRefresh, onPrefer }) {
  const className = [
    `Connection`,
    `Connection--${running ? 'running': 'not-running'}`,
    `Connection--${disabled ? 'disabled': 'not-disabled'}`,
    `Connection--${active ? 'active': 'not-active'}`,
    `Connection--${preferred ? 'preferred': 'not-preferred'}`
  ].join(' ');

  const label = interfaceName.split('-')[1]; // Connection name looks like `PPPoE-ISPName`,

  const refreshButton = ()=> (
    <button className="Connection__action" title="Refresh Connection" onClick={onRefresh}>
      <i className="icon-refresh"></i> Refresh
    </button>
  );

  const preferButton = ()=> (
    <button className="Connection__action" title="Refresh Connection" onClick={onPrefer}>
      <i className="icon-favorite"></i> Prefer
    </button>
  );

  return (
    <a className={className}>
      <div className="Connection__label">{label}</div>
      <div className="Connection__actions">
        { !preferred ? preferButton() : null }
        { refreshButton() }
      </div>
    </a>
  );
}
