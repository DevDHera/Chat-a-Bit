import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);

const sendNotification = (owner_uid: any, type: any) => {
  return new Promise((resolve, reject) => {
    return admin
      .firestore()
      .collection('users')
      .doc(owner_uid)
      .get()
      .then((doc: any) => {
        if (doc.exists && doc.data().token) {
          if (type === 'new_comment') {
            admin
              .messaging()
              .sendToDevice(doc.data().token, {
                data: {
                  title: 'A new comment has been made on your post.',
                  sound: 'default',
                  body: 'Tap to Check'
                }
              })
              .then(sent => {
                resolve(sent);
              })
              .catch(err => {
                reject(err);
              });
          } else if (type === 'new_like') {
            admin
              .messaging()
              .sendToDevice(doc.data().token, {
                data: {
                  title: 'Someone liked your post on Feedly.',
                  sound: 'default',
                  body: 'Tap to Check'
                }
              })
              .then(sent => {
                resolve(sent);
              })
              .catch(err => {
                reject(err);
              });
          }
        }
      });
  });
};

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

export const updateLikesCount = functions.https.onRequest(
  (request, response) => {
    console.log(request.body);
    let body: any;
    if (typeof request.body === 'string') {
      body = JSON.parse(request.body);
    } else {
      body = request.body;
    }
    const postId = body.postId;
    const userId: string = body.userId;
    const action = body.action; // 'like' or 'unlike'

    admin
      .firestore()
      .collection('posts')
      .doc(postId)
      .get()
      .then((data: any) => {
        let likesCount = data.data().likesCount || 0;
        const likes = data.data().likes || [];
        const updateData: { likesCount: number; likes: string[] } = {
          likesCount: likesCount,
          likes: likes
        };
        if (action === 'like') {
          updateData['likesCount'] = ++likesCount;
          updateData['likes'].push(userId);
        } else {
          updateData['likesCount'] = --likesCount;
          updateData['likes'].splice(updateData['likes'].indexOf(userId), 1);
        }
        admin
          .firestore()
          .collection('posts')
          .doc(postId)
          .update(updateData)
          .then(async () => {
            if (action == 'like') {
              await sendNotification(data.data().owner, 'new_like');
            }
            response.status(200).send('Done');
          })
          .catch(error => {
            response.status(error.code).send(error.message);
          });
      })
      .catch(error => {
        response.status(error.code).send(error.message);
      });
  }
);

export const updateCommentsCount = functions.firestore
  .document('comments/{commentId}')
  .onCreate(async event => {
    let data: any = event.data();

    let postId = data.post;

    let doc: any = await admin
      .firestore()
      .collection('posts')
      .doc(postId)
      .get();

    if (doc.exists) {
      let commentsCount = doc.data().commentsCount || 0;
      commentsCount++;

      await admin
        .firestore()
        .collection('posts')
        .doc(postId)
        .update({
          commentsCount: commentsCount
        });

      return sendNotification(doc.data().owner, 'new_comment');
    } else {
      return false;
    }
  });
