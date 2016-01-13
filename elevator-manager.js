{
  init: function(elevators, floors) {
    console.clear();
    this.elevators = elevators;
    this.floors = floors;
    this.doInit();
  },

  doInit: function() {
    this.floors.forEach(function(floor) {
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

  callElevator: function(direction, fromFloor) {
    this.requestPickup(fromFloor.floorNum(), direction);
    var elevator,
        idleElevators = this.elevators.filter(function(elevator) { return elevator.idle; });
    if (idleElevators.length) {
      elevator = this.findRandomElement(idleElevators);
      this.setIndicators(elevator, direction);
      delete elevator.idle;
    } else {
      // TODO take into account caller origin & direction
      elevator = this.getRandomElevator();
    }
    elevator.goToFloor(fromFloor.floorNum());
  },

  elevatorIdle: function(elevator) {
    elevator.idle = true;
    this.setIndicators(elevator, "stopped");
    this.logStatus();
  },

  elevatorsFloorButtonPressed: function(elevator, desiredFloor) {
    this.logStatus();
    this.requestRoute(elevator, desiredFloor);
    elevator.goToFloor(desiredFloor);
  },

  elevatorPassingFloor: function(elevator, floorNum, direction) {
    if (floorNum == 1 && direction == "down") {
      this.setIndicators(elevator, "up");
    } else if (floorNum == this.elevators.length - 1 && direction == "up") {
      this.setIndicators(elevator, "down");
    }
  },

  findRandomElement: function(arr) {
    return arr[this.getRandomInt(0, arr.length)];
  },

  floorsDownButtonPressed: function(floor) {
    this.callElevator("down", floor);
  },

  floorsUpButtonPressed: function(floor) {
    this.callElevator("up", floor);
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
    // console.log(table);
  },

  requestPickup: function(fromFloor, direction) {
    // TODO replace with fuller map...
  },

  requestRoute: function(elevator, toFloor) {
    // TODO
  },

  setIndicators: function(elevator, direction) {
    elevator.goingDownIndicator(direction == "down");
    elevator.goingUpIndicator(direction == "up");
  },

  update: function(dt, elevators, floors) {}
}
