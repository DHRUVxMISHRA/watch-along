import { io as ClientSocket } from 'socket.io-client';

async function runTests() {
  console.log('=== STARTING AUTOMATED WATCHTOGETHER E2E TESTS ===\n');

  const BASE_URL = 'http://localhost:3001';

  // 1. Health check
  console.log('1. Testing /api/health endpoint...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log('   Health response:', healthData);
  if (healthData.status !== 'ok') throw new Error('Health check failed');
  console.log('   ✓ Health check passed\n');

  // 2. Create Room via REST
  console.log('2. Testing POST /api/rooms (Room Creation)...');
  const createRes = await fetch(`${BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomName: 'Friday Movie Night',
      videoUrl: 'https://www.youtube.com/watch?v=zSWdZVtXT7E'
    })
  });
  const createData = await createRes.json();
  console.log('   Create Room response:', createData);
  if (!createData.success || !createData.room?.roomId) throw new Error('Room creation failed');
  const roomId = createData.room.roomId;
  console.log(`   ✓ Room created successfully with Code: #${roomId}\n`);

  // 3. Validate Room code via GET /api/rooms/:roomId
  console.log(`3. Testing GET /api/rooms/${roomId}...`);
  const getRes = await fetch(`${BASE_URL}/api/rooms/${roomId}`);
  const getData = await getRes.json();
  if (!getData.success || getData.room?.roomId !== roomId) throw new Error('Get Room failed');
  console.log(`   ✓ Room validated: "${getData.room.roomName}", Video: ${getData.room.playbackState.videoId}\n`);

  // 4. WebSocket Client 1: Connect Host
  console.log('4. Connecting Client 1 (Dhruv - Host)...');
  const hostSocket = ClientSocket(BASE_URL, { transports: ['websocket'] });

  await new Promise<void>((resolve, reject) => {
    hostSocket.on('connect', () => {
      hostSocket.emit(
        'join_room',
        { roomId, username: 'Dhruv', userId: 'user_host_1' },
        (res) => {
          if (res.success && res.userRole === 'HOST') {
            console.log('   ✓ Host joined with role:', res.userRole);
            resolve();
          } else {
            reject(new Error('Host join failed: ' + JSON.stringify(res)));
          }
        }
      );
    });
  });

  // 5. WebSocket Client 2: Connect Participant (Alex Chen)
  console.log('\n5. Connecting Client 2 (Alex Chen - Participant)...');
  const alexSocket = ClientSocket(BASE_URL, { transports: ['websocket'] });

  await new Promise<void>((resolve, reject) => {
    alexSocket.on('connect', () => {
      alexSocket.emit(
        'join_room',
        { roomId, username: 'Alex Chen', userId: 'user_alex_2' },
        (res) => {
          if (res.success && res.userRole === 'PARTICIPANT') {
            console.log('   ✓ Alex joined as:', res.userRole);
            resolve();
          } else {
            reject(new Error('Alex join failed: ' + JSON.stringify(res)));
          }
        }
      );
    });
  });

  // 6. WebSocket Client 3: Connect Participant (Rahul Sharma)
  console.log('\n6. Connecting Client 3 (Rahul Sharma - Participant)...');
  const rahulSocket = ClientSocket(BASE_URL, { transports: ['websocket'] });

  await new Promise<void>((resolve, reject) => {
    rahulSocket.on('connect', () => {
      rahulSocket.emit(
        'join_room',
        { roomId, username: 'Rahul Sharma', userId: 'user_rahul_3' },
        (res) => {
          if (res.success && res.userRole === 'PARTICIPANT') {
            console.log('   ✓ Rahul joined as:', res.userRole);
            resolve();
          } else {
            reject(new Error('Rahul join failed: ' + JSON.stringify(res)));
          }
        }
      );
    });
  });

  // 7. Test Server-Side RBAC Enforcement: Participant cannot control playback directly
  console.log('\n7. Testing Server-Side RBAC: Unauthorized Participant attempting to play...');
  await new Promise<void>((resolve, reject) => {
    alexSocket.emit('play', {}, (res) => {
      if (!res.success && res.error?.includes('Only Host or Moderator')) {
        console.log('   ✓ Server rejected unauthorized play command:', res.error);
        resolve();
      } else {
        reject(new Error('Server failed to reject unauthorized play event!'));
      }
    });
  });

  console.log('   Testing Server-Side RBAC: Unauthorized Participant attempting to change video...');
  await new Promise<void>((resolve, reject) => {
    alexSocket.emit('change_video', { videoId: 'dQw4w9WgXcQ' }, (res) => {
      if (!res.success && res.error?.includes('Only Host or Moderator')) {
        console.log('   ✓ Server rejected unauthorized change_video command:', res.error);
        resolve();
      } else {
        reject(new Error('Server failed to reject unauthorized change_video event!'));
      }
    });
  });

  // 8. Test Host Playback Control & Broadcast (Seek then Play)
  console.log('\n8. Testing Host Playback Control & Broadcast (Seek & Play)...');
  await new Promise<void>((resolve) => {
    alexSocket.once('sync_state', (state) => {
      if (state.currentTime === 45) {
        console.log('   ✓ Alex received synchronized seek: currentTime = 45s');
        resolve();
      }
    });
    hostSocket.emit('seek', { time: 45 });
  });

  await new Promise<void>((resolve) => {
    alexSocket.once('sync_state', (state) => {
      if (state.isPlaying) {
        console.log('   ✓ Alex received synchronized play state: isPlaying = true');
        resolve();
      }
    });
    hostSocket.emit('play', {});
  });

  // 9. Test Host Role Assignment: Promote Rahul to Moderator
  console.log('\n9. Testing Role Promotion: Host promotes Rahul to MODERATOR...');
  await new Promise<void>((resolve) => {
    rahulSocket.once('role_assigned', (data) => {
      if (data.userId === 'user_rahul_3' && data.role === 'MODERATOR') {
        console.log('   ✓ Rahul received promotion to MODERATOR');
        resolve();
      }
    });
    hostSocket.emit('assign_role', { userId: 'user_rahul_3', role: 'MODERATOR' });
  });

  // 10. Test Moderator Privilege: Rahul can now control playback (Pause)
  console.log('\n10. Testing Moderator Playback Control: Rahul pauses video...');
  await new Promise<void>((resolve) => {
    hostSocket.once('sync_state', (state) => {
      if (!state.isPlaying) {
        console.log('   ✓ Host received pause broadcast initiated by Moderator Rahul');
        resolve();
      }
    });
    rahulSocket.emit('pause', {});
  });

  // 11. Test Permission Request & Approval Workflow
  console.log('\n11. Testing Permission Request & Approval Workflow...');
  let pendingRequestId = '';

  await new Promise<void>((resolve) => {
    hostSocket.once('permission_received', (req) => {
      console.log('   ✓ Host received permission request from:', req.username, 'for action:', req.action);
      pendingRequestId = req.requestId;
      resolve();
    });
    alexSocket.emit('permission_request', {
      action: 'change_video',
      payload: { videoId: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up' }
    });
  });

  // Host approves request
  console.log('   Host approving request...');
  await new Promise<void>((resolve) => {
    alexSocket.once('sync_state', (state) => {
      if (state.videoId === 'dQw4w9WgXcQ') {
        console.log('   ✓ Video successfully updated to:', state.videoId, 'via approved permission!');
        resolve();
      }
    });
    hostSocket.emit('resolve_permission', { requestId: pendingRequestId, approved: true });
  });

  // 12. Test Host Participant Removal (Kick)
  console.log('\n12. Testing Participant Removal: Host kicks Alex...');
  await new Promise<void>((resolve) => {
    alexSocket.once('kicked', (data) => {
      console.log('   ✓ Alex received kicked notification:', data.reason);
      resolve();
    });
    hostSocket.emit('remove_participant', { userId: 'user_alex_2' });
  });

  // Graceful cleanup
  hostSocket.close();
  alexSocket.close();
  rahulSocket.close();

  console.log('\n=== ALL 12 VERIFICATION SUITES PASSED FLAWLESSLY! ===\n');
  setTimeout(() => {
    process.exit(0);
  }, 200);
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
