{
  init: function(elevators, floors) {
    console.clear();
    this.waitingPassengers = [];
    this.elevators = elevators;
    this.floors = floors;
    this.doInit();
  },

  doInit: function() {
    this.floors.forEach(function(floor) {
      this.waitingPassengers[floor.floorNum()] = this.blankWaitingPassengers();
      floor.on("down_button_pressed", this.floorsDownButtonPressed.bind(this, floor));
      floor.on("up_button_pressed", this.floorsUpButtonPressed.bind(this, floor));
    }, this);
    this.elevators.forEach(function(elevator, index) {
      elevator.which = index;
      elevator.on("floor_button_pressed", this.elevatorsFloorButtonPressed.bind(this, elevator));
      elevator.on("passing_floor", this.elevatorPassingFloor.bind(this, elevator));
      elevator.on("idle", this.elevatorIdle.bind(this, elevator));
    }, this);
  },

  blankWaitingPassengers: function() {
    return { down: 0, up: 0 };
  },

  callElevator: function() {
    // return an idle elevator if there is one, otherwise a random one
    // TODO take into account caller origin & direction
    var idleElevators = this.elevators.filter(function(elevator) { return elevator.idle; });
    if (idleElevators.length) {
      var elevator = this.findRandomElement(idleElevators);
      delete elevator.idle;
      return elevator;
    }
    return this.getRandomElevator();
  },

  elevatorIdle: function(elevator) {
    console.warn("#"+elevator.which + " idle!");
    elevator.idle = true;
    this.logStatus();
  },

  elevatorsFloorButtonPressed: function(elevator, desiredFloor) {
    this.waitingPassengers[elevator.currentFloor()] = this.blankWaitingPassengers(); // ideally we picked everyone up...
    this.logStatus();
    elevator.goToFloor(desiredFloor);
  },

  elevatorPassingFloor: function(elevator, floorNum, direction) {
  },

  findRandomElement: function(arr) {
    return arr[this.getRandomInt(0, arr.length)];
  },

  floorsDownButtonPressed: function(floor) {
    this.hasAPassenger(floor.floorNum(), "down");
    this.callElevator().goToFloor(floor.floorNum());
  },

  floorsUpButtonPressed: function(floor) {
    this.hasAPassenger(floor.floorNum(), "up");
    this.callElevator().goToFloor(floor.floorNum());
  },

  getRandomElevator: function() {
    return this.findRandomElement(this.elevators);
  },

  getRandomFloor: function() {
    return this.getRandomInt(0, this.floors.length);
  },

  getRandomInt: function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  },

  hasAPassenger: function(floorNum, direction) {
    this.waitingPassengers[floorNum] || (this.waitingPassengers[floorNum] = this.blankWaitingPassengers());
    this.waitingPassengers[floorNum][direction] += 1;
  },

  logStatus: function() {
    function reduceIt(dataSheet, elevator) {
      dataSheet["#" + elevator.which] = {
        idle: elevator.idle,
        pressedFloors: elevator.getPressedFloors().join(", "),
        destinationQueue: elevator.destinationQueue.join(", ")
      };
      return dataSheet;
    }
    var table = this.elevators.reduce(reduceIt, {});
    // table.requestingPassengers = this.waitingPassengers.join(" – ");
    // console.log(table);
  },

  update: function(dt, elevators, floors) {}
}
