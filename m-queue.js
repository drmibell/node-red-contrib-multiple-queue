/**
 * Copyright 2018-2020 M. I. Bell
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
module.exports = function(RED) {
    function MultipleQueueNode(config) {
        RED.nodes.createNode(this,config);
        // Copy configuration items
        this.queueSelect = config.queueSelect.toLowerCase();
        this.controlFlag = config.controlFlag.toLowerCase();
        // special queues
        this.defaultQueue = config.defaultQueue.toLowerCase();
        this.allQueues = config.allQueues.toLowerCase();
        // commands
        this.triggerCmd = config.triggerCmd.toLowerCase();
        this.statusCmd = config.statusCmd.toLowerCase();
        this.pauseCmd = config.pauseCmd.toLowerCase();
        this.resumeCmd = config.resumeCmd.toLowerCase();
        this.flushCmd = config.flushCmd.toLowerCase();
        this.resetCmd = config.resetCmd.toLowerCase();
        this.peekCmd = config.peekCmd.toLowerCase();
        this.dropCmd = config.dropCmd.toLowerCase();
        // queue properties
        this.keepNewestDefault = config.keepNewestDefault;
        this.maxSizeDefault = parseInt(config.maxSizeDefault);        
        this.setMaximumFlag = config.setMaximumFlag.toLowerCase();
        this.keepNewestFlag = config.keepNewestFlag.toLowerCase();
        this.persist = config.persist;
        this.storeName = config.storeName;
        this.outputs = config.outputs // debug
        this.statusOutput = config.statusOutput // debug

        // Save "this" object
        var node = this;
        var context = node.context();
        var queueSelect = node.queueSelect;
        var controlFlag = node.controlFlag
        var defaultQueue = node.defaultQueue;
        var allQueues = node.allQueues;
        var persist = node.persist;
        var storeName = node.storeName
        var keepNewestDefault = node.keepNewestDefault
        var maxSizeDefault = node.maxSizeDefault

// Handle persistence
        // Gate status & max queue size
        if (maxSizeDefault <= 0) {
            maxSizeDefault = Infinity;
        }
        let qArray = [
            {
                qName: defaultQueue,
                msgQ: [],
                paused: false,
                keepNewest: keepNewestDefault,
                maxSize: maxSizeDefault
            }]
        context.set('qArray', qArray,storeName)
        // Initialize status display
        node.status({text:0 + ' messages, ' + 1 + ' queues'})
        // Process inputs
        node.on('input', function(msg) {
            let qArray = context.get('qArray',storeName)
            let qSelect = msg[queueSelect]
            let Q = {}
            let qIndex = 0
            let qExists = true
            if (qSelect === allQueues) {
                first = 0
                last = qArray.length
            } else if (qSelect == undefined || qSelect == '') { // qSelect undefined?
                first =0
                last = 1
            } else {    // queue exists?
                qExists = false
                for (i = 0; i < qArray.length; i++) {
                    if (qArray[i].qName == qSelect) {
                        qExists = true
                        qIndex = i
                    }
                }
                if (qExists) {
                    first = qIndex
                    last = qIndex + 1
                } else {
                    first = 0
                    last = 1
                }
            }
            for (qIndex = first; qIndex < last; qIndex++) {
                if (msg[controlFlag]) {  // execute command
                    if (!qExists) {
                        node.warn('Invalid command ignored: queue does not exist.')
                        return
                    }
                    Q = qArray[qIndex]
                    switch (msg.payload) {
                        case node.triggerCmd:
                            if (Q.paused) {break}
                            node.send (Q.msgQ.shift())
                            if (qIndex != 0 && Q.msgQ.length === 0) {  // delete empty queue
                                qArray.splice(qIndex,1)
                            }
                            break
                        case node.peekCmd:    // works when queue is paused
                            node.send(RED.util.cloneMessage(Q.msgQ[0]));
                            break
                        case node.dropCmd:
                            if (Q.paused) {break}
                            Q.msgQ.shift()
                            break
                        case node.flushCmd:
                            if (Q.paused) {break}
                            node.send([Q.msgQ])
                        case node.resetCmd:
                            if (Q.paused) {break}
                            if (qIndex != 0) {  // delete queue
                                qArray.splice(qIndex,1)
                            } else {
                                Q.msgQ = []
                            }
                            break
                        case node.resumeCmd:
                            Q.paused = false
                            break
                        case node.pauseCmd:
                            Q.paused = true
                            break
                        case 'maximum':
                            Q.maxSize = msg.maximum // ??? msg[maximum]
                            break
                        case node.statusCmd:
//                            node.send([null,qArray])   // ???
//                            node.send([qArray])   // ???
 //                           node.send({payload: qArray})   // ???
                            node.send([null,{payload: Q}])   // ???
                        break
                        default:
                            node.warn('Invalid command ignored');
                        }
                    } else {    // queue message
                        if (!qExists) {  // if queue does not exist, create new queue
                            qArray.push({
                                qName: qSelect,
                                msgQ: [msg],
                                paused: false,
                                keepNewest: keepNewestDefault,
                                maxSize: maxSizeDefault
                            })
                        } else {  // use existing queue
                            Q = qArray[qIndex]
                            if (!Q.paused) {   // queue not paused
                                if (Q.msgQ.length < Q.maxSize) {  // queue not full
                                    Q.msgQ.push(msg)
                                } else if (Q.keepNewest) { // keep newest, drop oldest
                                    Q.msgQ.push(msg);
                                    Q.msgQ.queue.shift();
                                }
                            }
                        }
                    }
                }
            let n = 0   // show status
            for (i = 0; i < qArray.length; i++) {
                n = n + qArray[i].msgQ.length
                }
            node.status({text:n + ' messages, ' + qArray.length + ' queues'})
            context.set('qArray',qArray,storeName)
        })
    }
    RED.nodes.registerType("m-queue",MultipleQueueNode);
}