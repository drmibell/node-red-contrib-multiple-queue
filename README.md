# node-red-contrib-multiple-queue
A Node-RED node providing multiple, independently controlled message queues

## Install

Use the Node-RED `Manage Palette` command or run the following command in the Node-RED user directory (typically `~/.node-red`):

    npm install node-red-contrib-multiple-queue
    
    
## Design
The `m-queue` node provides multiple, independently controlled message queues. Each queue behaves similarly to the `queueing` state of the [node-red-contrib-queue-gate](https://flows.nodered.org/node/node-red-contrib-queue-gate) node. The requirement to control each queue individually, however, adds some complexity to the design, and this is reflected in the control mechanism. Queues are created as needed and destroyed when empty, except for the `default` queue (see below). Each queue is identified by a `Name` string, which is used to steer messages to it, where they are stored or used to control the queue. This name is matched against the `Queue Selector` string provided by default in the `msg.topic` property, but the user can select any other message property for this purpose, thus retaining flexibility. Similarly, all the other message properties used to control the queues are defined by default but are available to be customized in the node edit dialog.

## Usage

An incoming message is added to the queue identified by the `Queue Selector`. If no such queue exists, one is created. If the `Queue Selector` is `undefined` or an empty string, the message is added to the queue identified as `default`, which is always available. Messages with the user-defined property `Control Flag` set to `true` (or a JavaScript equivalent) are not queued but are used to control the queues. These control messages can have payloads (case-insensitive strings) that the user has defined to represent commands for `trigger`, `pause`, `resume`,`flush`, `peek`, `drop`, `reset`, `status`, and `maximum`. If a control message is received with a payload that is a number or boolean, the payload is converted to a string and then tested against the command definitions. If a control message is received but not recognized, there is no output or change of state, and the node issues a warning. A control message can sent to all queues by setting the `Queue Selector` to the value defined in `All Queues`.

Each queue responds independently to control messages addressed to it by performing the following actions:
<p align="center"> <img  src="https://github.com/drmibell/node-red-contrib-multiple-queue/blob/master/images/definitions.png?raw=true" width="85%"></p>

Further information on the `peek` and `drop` commands can be found in the documentation for the [node-red-contrib-queue-gate](https://flows.nodered.org/node/node-red-contrib-queue-gate) node. If a queue has been paused by `pause` command, it will no longer queue incoming messages or accept most commands. Only commands that do not affect the contents of a queue will be executed while it is paused. These are indicated by an asterisk in the table above.  A limited indication of node activity is provided by the status text, which displays the number of queues in operation and the total number of messages queued.

The user can limit the size of each queue to prevent memory problems. The `default` queue and all new queues will be created with the limit specified in the edit dialog. This can be changed by addressing a `maximum` command to one or all queues and providing the maximum value in the `Queue Limit` property. 

By default, messages arriving when a queue is full are discarded, so that the queue contains the oldest messages. The user can, however, set the `Keep newest messages`  
checkbox in order to have the `default` queue and all new queues created with the opposite behavior: new messages are added to the queue (at the tail), while discarding the oldest message (from the head), with the result that the queue contains the most recent messages. This behavior can be controlled on an individual queue basis by addressing a control message to that queue with the `Newest Flag` property set to `true` or `false`.

Changes to the maximum queue size or the `Keep newest messages` property do not affect messages already in the queue.

The state of the node (all queues and their contents) is maintained in the node context. If a persistent (non-volatile) form of context storage is available, the user has the option of restoring the state from that storage after a restart of Node-RED. This is done by activating the `Restore from state saved in` option (checkbox) in the edit dialog and choosing a non-volatile storage module from the adjacent dropdown list, which shows all the storage modules enabled in the Node-RED `settings.js` file.

## Examples
### Basic Operation
This flow demonstrates the basic operation of the `m-queue` node and the commands that can be used to change or display its state or manage the queue.


## Author
[Mike Bell](https://www.linkedin.com/in/drmichaelbell/) (drmike)
