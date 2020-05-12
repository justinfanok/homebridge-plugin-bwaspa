import { CharacteristicEventTypes } from 'homebridge';
import type { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback} from 'homebridge';

import { SpaHomebridgePlatform } from './platform';

/**
 * Control a 1- or 2- speed pump as a "fan"
 */
export class PumpAccessory {
  private service: Service;

  /**
   * Remember the last speed so that flipping the pump on/off will use the same 
   * speed as last time.
   */
  private states = {
    lastSpeed: 2
  }

  // Where we have a 1 speed pump, only 'Off' and 'High' are used.
  private readonly speeds: string[] = ["Off", "Low", "High"];
  // Always 1 or 2
  speedSettings : number;

  constructor(
    private readonly platform: SpaHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly pumpNumber : number
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Balboa')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Fan) ?? this.accessory.addService(this.platform.Service.Fan);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);
    this.speedSettings = accessory.context.device.pumpRange;
    if (this.speedSettings != 1 && this.speedSettings != 2) {
      this.platform.log.warn("Bad speed settings:", this.speedSettings, " should be 1 or 2.");
      this.speedSettings = 1;
    }

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on(CharacteristicEventTypes.SET, this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .on(CharacteristicEventTypes.GET, this.getOn.bind(this));               // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .on(CharacteristicEventTypes.SET, this.setRotationSpeed.bind(this))        // SET - bind to the 'setRotationSpeed` method below
      .on(CharacteristicEventTypes.GET, this.getRotationSpeed.bind(this));       // GET - bind to the 'getRotationSpeed` method below

  }

  /**
   * Handle "SET" requests from HomeKit
   * Turns the device on or off.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    // implement your own code to turn your device on/off
    if (value as boolean) {
      this.setSpeed(this.states.lastSpeed);
    } else {
      this.setSpeed(0);
    }
    this.platform.log.debug('Set Pump Characteristic On ->', value);

    // you must call the callback function
    callback(null);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   * 
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   * 
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  getOn(callback: CharacteristicGetCallback) {

    // implement your own code to check if the device is on
    const isOn = this.getSpeed() != 0;
  
    this.platform.log.debug('Get Pump Characteristic On ->', isOn);

    // you must call the callback function
    // the first argument should be null if there were no errors
    // the second argument should be the value to return
    callback(null, isOn);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  setRotationSpeed(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    // implement your own code to set the brightness
    const speed = Math.round((value as number)*this.speedSettings/100.0);
    this.setSpeed(speed);
    this.platform.log.debug('Set Pump Characteristic Speed -> ', value, ' which is ', this.speeds[speed]);

    // you must call the callback function
    callback(null);
  }

    /**
   * Handle "GET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  getRotationSpeed(callback: CharacteristicSetCallback) {
    const speed = this.getSpeed();
    const value = (100.0*speed)/this.speedSettings;
    this.platform.log.debug('Get Pump Characteristic Speed -> ', value, ' which is ', this.speeds[speed]);

    // you must call the callback function
    callback(null, value);
  }

  private getSpeed() {
    var speed = 0;
    if (this.pumpNumber == 1) {
      speed = this.speeds.indexOf(this.platform.spa.get_pump1());
    } else if (this.pumpNumber == 2) {
      speed = this.speeds.indexOf(this.platform.spa.get_pump2());
    } else if (this.pumpNumber == 3) {
      speed = this.speeds.indexOf(this.platform.spa.get_pump3());
    }
    return speed;
  }

  private setSpeed(speed: number) {
    if (this.pumpNumber == 1) {
      this.platform.spa.set_pump1(this.speeds[speed]);
    } else if (this.pumpNumber == 2) {
      this.platform.spa.set_pump2(this.speeds[speed]);
    } else if (this.pumpNumber == 3) {
      this.platform.spa.set_pump3(this.speeds[speed]);
    }
    if (speed != 0) {
      this.states.lastSpeed = speed;
    }
  }
}
