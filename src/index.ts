import 'reflect-metadata'; // This import must come before any entity imports
import AppServer from './server.js';

const appServer = new AppServer();

async function boot() {
  try {
    await appServer.initialize();
    appServer.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

boot();

export default appServer.getApp();
