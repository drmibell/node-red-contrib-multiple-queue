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
    "use strict"
    function MultipleQueueNode(config) {
        RED.nodes.createNode(this,config);
        // control properties
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
        this.maximumCmd = config.maximumCmd.toLowerCase();
        this.newestCmd = config.newestCmd.toLowerCase();
        this.bypassCmd = config.bypassCmd.toLowerCase();
        this.emptyTtlCmd = config.emptyTtlCmd.toLowerCase();
        this.deleteCmd = config.deleteCmd.toLowerCase()
        // queue properties
        this.maxSizeDefault = parseInt(config.maxSizeDefault);
        this.keepNewestDefault = config.keepNewestDefault;
        this.bypassDefault = config.bypassDefault
        this.emptyTtlDefault = config.emptyTtlDefault
        this.persist = config.persist;
        this.storeName = config.storeName;
        this.newValue = config.newValue
        this.outputs = config.outputs
        this.statusOutput = config.statusOutput
        // Save "this" object
        var node = this;
        var context = node.context();
        var queueSelect = node.queueSelect;
        var controlFlag = node.controlFlag
        var defaultQueue = node.defaultQueue;
        var allQueues = node.allQueues;
        var persist = node.persist;
        var storeName = node.storeName
        var newValue = node.newValue
        var keepNewestDefault = node.keepNewestDefault
        var maxSizeDefault = node.maxSizeDefault < 0 ? Number.MAX_SAFE_INTEGER : node.maxSizeDefault
        var bypassDefault = node.bypassDefault
        var emptyTtlDefault = node.emptyTtlDefault < 0 ? Number.MAX_SAFE_INTEGER : node.emptyTtlDefault
        // Definitions
        let qArrayInit = [
            {
                qName: defaultQueue,
                msgQ: [],
                maxSize: maxSizeDefault,
                paused: false,
                keepNewest: keepNewestDefault,
                emptyTtl: Number.MAX_SAFE_INTEGER, // cannot change
                emptyQueueSince: 0,
                bypass: false    // cannot change
            }]
        function showStatus(qArray) {
            let n = 0
            for (let i = 0; i < qArray.length; i++) {
                n = n + qArray[i].msgQ.length
            }
            node.status({text:n + ' messages, ' + qArray.length + ' queues'})
            return
        }
        function findQueue(qSelect,qArray){
            for (let i = 0; i < qArray.length; i++) {
                if (qArray[i].qName === qSelect) {
                    return i
                }
            }
            return -1
        }
        function createQueue(qSelect,qArray,msgQ){
            qArray.push({
                qName: qSelect,
                msgQ: msgQ,
                maxSize: maxSizeDefault,
                paused: false,
                keepNewest: keepNewestDefault,
                emptyTtl: emptyTtlDefault,
                emptyQueueSince: 0,
                bypass: bypassDefault
            })
            return qArray.length - 1
        }
        function enqueue(msg,Q) {
            if (!Q.paused) {    // queue not paused
                if (Q.bypass) {    // not queuing, we bypass enqueue and send message
                    node.send(msg)
                } else if (Q.msgQ.length < Q.maxSize) {    // queue not full
                    Q.msgQ.push(msg)    // queue message
                } else if (Q.keepNewest) {  // keep newest, otherwise drop
                    Q.msgQ.push(msg)
                    Q.msgQ.shift()
                }
            }
        }
        // Startup
        let qArray = persist ? context.get('qArray',storeName) : qArrayInit
        qArray = qArray || qArrayInit
        showStatus(qArray)
        context.set('qArray', qArray,storeName)
        // Process inputs
        node.on('input', function(msg) {
            let qArray = context.get('qArray',storeName)
            let qSelect = msg[queueSelect]
            let Q = {}
            let qIndex = 0
            let first, last = 0
            if (typeof qSelect === 'undefined' || qSelect === '') { // qSelect undefined?
                qSelect =  defaultQueue
            }
            if (msg[controlFlag]) {  // execute command
                if (qSelect === allQueues){
                    first = 0
                    last = qArray.length
                } else {
                    first = findQueue(qSelect,qArray)
                    if (first < 0) {
                        first = createQueue(qSelect,qArray, [])
                        node.debug('Queue did not exist. Created an empty one.')
                    }
                    last = first + 1
                }
                let now = Date.now()
                for (let i = first; i < last; i++) {
                    Q = qArray[i]
                    switch (msg.payload.toString().toLowerCase()) {
                        case node.triggerCmd:
                            if (Q.paused) {break}
                            node.send(Q.msgQ.shift())
                            break
                        case node.peekCmd:
                            node.send(RED.util.cloneMessage(Q.msgQ[0]))
                            break
                        case node.dropCmd:
                            if (Q.paused) {break}
                            Q.msgQ.shift()
                            break
                        case node.flushCmd:
                            if (Q.paused) {break}
                            node.send([Q.msgQ])
                            Q.msgQ = []                            
                            break
                        case node.resetCmd:
                            if (Q.paused) {break}
                            Q.msgQ = []
                            break
                        case node.resumeCmd:
                            Q.paused = false
                            break
                        case node.pauseCmd:
                            Q.paused = true
                            Q.bypass = false
                            break
                        case node.maximumCmd:
                            let newMax = msg[newValue]
                            if (typeof newMax === 'undefined') {
                                Q.maxSize = maxSizeDefault
                            } else if (newMax < 0) {
                                Q.maxSize = Number.MAX_SAFE_INTEGER
                            } else {
                                Q.maxSize = newMax
                            }
                            break
                        case node.newestCmd:
                            let newKeep = msg[newValue]
                            if (typeof newKeep === 'undefined') {
                                newKeep = keepNewestDefault
                            }
                            Q.keepNewest = newKeep
                            break
                        case node.bypassCmd:
                            if (Q.qName === defaultQueue) {break}
                            let newBypass = msg[newValue]
                            if (typeof newBypass === 'undefined') {
                                newBypass = bypassDefault
                            }
                            Q.bypass = newBypass
                            if (Q.bypass){
                                node.send([Q.msgQ])
                                Q.msgQ = []
                            }
                            break
                        case node.emptyTtlCmd:
                            if (Q.qName === defaultQueue) {break}
                            let newTtl = msg[newValue]
                            if (typeof newTtl === 'undefined') {
                                Q.emptyTtl = maxSizeDefault
                            } else if (newTtl < 0) {
                                Q.emptyTtl = Number.MAX_SAFE_INTEGER
                            } else {
                                Q.emptyTtl = newTtl
                            }
                            break
                        case node.deleteCmd:
                            if (Q.paused) {break}
                            if (Q.qName != defaultQueue)
                                Q.emptyTtl = 0
                                Q.msgQ = []
                            break
                        case node.statusCmd:
                            node.send([null,{payload: qArray[i]}])
                            break
                        default:
                            node.warn('Invalid command ignored')
                    }
                }
                let qArrayTemp = []    // delete empty queues
                for (let i = 0; i < qArray.length; i++){
                    if (qArray[i].emptyQueueSince === 0 && qArray[i].msgQ.length === 0) {
                        qArray[i].emptyQueueSince = now
                    }
                    if (qArray[i].msgQ.length > 0 || (now - qArray[i].emptyQueueSince) < qArray[i].emptyTtl) {
                        qArrayTemp.push(qArray[i])
                    }
                }
                qArray = qArrayTemp
            } else {    // queue message
                if (qSelect === allQueues) {
                    for (let i = 0; i < qArray.length; i++) {
                        enqueue(msg,qArray[i])
                    }
                } else {
                    qIndex = findQueue(qSelect,qArray)
                    if (qIndex < 0) {   // create new queue
                        if(maxSizeDefault > 0){
                            createQueue(qSelect,qArray,[msg])
                        }
                    } else {    // use existing queue
                        enqueue(msg,qArray[qIndex])
                    }
                }
            }
            showStatus(qArray)
            context.set('qArray',qArray,storeName)
        })
    }
    RED.nodes.registerType("m-queue",MultipleQueueNode);
}