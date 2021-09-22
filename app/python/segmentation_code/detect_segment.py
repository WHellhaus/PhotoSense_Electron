import os
import sys
import math
import pathlib

import cv2
import numpy as np
from PIL import Image
from tensorflow.keras.preprocessing.image import img_to_array
from skimage.transform import resize
import matplotlib.pyplot as plt
import matplotlib.cm as cm

from keras.models import Model
from keras.layers import Input, BatchNormalization, Activation, Dropout
from keras.layers.convolutional import Conv2D, Conv2DTranspose
from keras.layers.pooling import MaxPooling2D
from keras.layers.merge import concatenate
from keras.optimizers import Adam

os.environ['KMP_DUPLICATE_LIB_OK']='True'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

IMG_WIDTH = 128 # for faster computing
IMG_HEIGHT = 128 # for faster computing
IMG_CHANNELS = 3
args = {'prototxt': 'deploy.prototxt.txt', 'model': 'res10_300x300_ssd_iter_140000.caffemodel', 'confidence': 0.7}
filePath = pathlib.Path(__file__).resolve()

def conv2d_block(input_tensor, n_filters, kernel_size = 3, batchnorm = True):
    """Function to add 2 convolutional layers with the parameters passed to it"""
    # first layer
    x = Conv2D(filters = n_filters, kernel_size = (kernel_size, kernel_size),\
              kernel_initializer = 'he_normal', padding = 'same')(input_tensor)
    if batchnorm:
        x = BatchNormalization()(x)
    x = Activation('relu')(x)
    
    # second layer
    x = Conv2D(filters = n_filters, kernel_size = (kernel_size, kernel_size),\
              kernel_initializer = 'he_normal', padding = 'same')(input_tensor)
    if batchnorm:
        x = BatchNormalization()(x)
    x = Activation('relu')(x)
    
    return x

def get_unet(input_img, n_filters = 16, dropout = 0.1, batchnorm = True):
    """Function to define the UNET Model"""
    # Contracting Path
    c1 = conv2d_block(input_img, n_filters * 1, kernel_size = 3, batchnorm = batchnorm)
    p1 = MaxPooling2D((2, 2))(c1)
    p1 = Dropout(dropout)(p1)
    
    c2 = conv2d_block(p1, n_filters * 2, kernel_size = 3, batchnorm = batchnorm)
    p2 = MaxPooling2D((2, 2))(c2)
    p2 = Dropout(dropout)(p2)
    
    c3 = conv2d_block(p2, n_filters * 4, kernel_size = 3, batchnorm = batchnorm)
    p3 = MaxPooling2D((2, 2))(c3)
    p3 = Dropout(dropout)(p3)
    
    c4 = conv2d_block(p3, n_filters * 8, kernel_size = 3, batchnorm = batchnorm)
    p4 = MaxPooling2D((2, 2))(c4)
    p4 = Dropout(dropout)(p4)
    
    c5 = conv2d_block(p4, n_filters = n_filters * 16, kernel_size = 3, batchnorm = batchnorm)
    
    # Expansive Path
    u6 = Conv2DTranspose(n_filters * 8, (3, 3), strides = (2, 2), padding = 'same')(c5)
    u6 = concatenate([u6, c4])
    u6 = Dropout(dropout)(u6)
    c6 = conv2d_block(u6, n_filters * 8, kernel_size = 3, batchnorm = batchnorm)
    
    u7 = Conv2DTranspose(n_filters * 4, (3, 3), strides = (2, 2), padding = 'same')(c6)
    u7 = concatenate([u7, c3])
    u7 = Dropout(dropout)(u7)
    c7 = conv2d_block(u7, n_filters * 4, kernel_size = 3, batchnorm = batchnorm)
    
    u8 = Conv2DTranspose(n_filters * 2, (3, 3), strides = (2, 2), padding = 'same')(c7)
    u8 = concatenate([u8, c2])
    u8 = Dropout(dropout)(u8)
    c8 = conv2d_block(u8, n_filters * 2, kernel_size = 3, batchnorm = batchnorm)
    
    u9 = Conv2DTranspose(n_filters * 1, (3, 3), strides = (2, 2), padding = 'same')(c8)
    u9 = concatenate([u9, c1])
    u9 = Dropout(dropout)(u9)
    c9 = conv2d_block(u9, n_filters * 1, kernel_size = 3, batchnorm = batchnorm)
    
    outputs = Conv2D(1, (1, 1), activation='sigmoid')(c9)
    model = Model(inputs=[input_img], outputs=[outputs])
    return model

def load_models():
    print("[INFO] loading model...")
    # self made keras U-Net model
    input_img = Input((IMG_HEIGHT, IMG_WIDTH, 3), name='img')
    model = get_unet(input_img, n_filters=16, dropout=0.05, batchnorm=True)
    model.compile(optimizer=Adam(), loss="binary_crossentropy", metrics=["accuracy"])
    model.load_weights(os.path.abspath(os.path.join(filePath,'..','face-segmentation.h5')))
    # OpenCV DNN Face detection model
    net = cv2.dnn.readNetFromCaffe(os.path.abspath(os.path.join(filePath,'..',args["prototxt"])), os.path.abspath(os.path.join(filePath,'..',args["model"])))

    print("[INFO] finished loading models")
    return model, net

def main():
    imageFolderPath = os.path.join(filePath, '..', '..', '..', 'temp', 'uploadedImages')
    file_names = [os.path.abspath(os.path.join(imageFolderPath, f)) for f in os.listdir(os.path.abspath(imageFolderPath)) if f.endswith(('.jpeg', '.jpg', '.png'))]

    images = []
    for file in file_names:
        image = Image.open(file)
        # if the image mode is not RGB, convert it
        if image.mode != "RGB":
            image = image.convert("RGB")
        image = img_to_array(image)
        image = np.expand_dims(image, axis=0)
        # print(image.shape)
        images.append(image)

    if (len(images) > 0):
        model, net = load_models()

        faces = {}
        for i in range(len(images)):
            image = images[i][0]
            (h,w) = image.shape[:2]
            if h > 2000 or w > 2000:
                blob = cv2.dnn.blobFromImage(image, mean=(104.0, 117.0, 123.0), swapRB=True)
                args['confidence'] = 0.7
            else:
                blob = cv2.dnn.blobFromImage(cv2.resize(image, (300, 300)), 1.0, (300, 300), (104.0, 117.0, 123.0), True)
                args['confidence'] = 0.7
            net.setInput(blob)
            detections = net.forward()

            if detections.shape[2] == 0:
                faces[i] = np.array([[[[0., 1., 1., 0., 0., 1., 1.]]]])
            else:
                faces[i] = detections

        X = []# cropped portion of image from faces list
        X_positions = []# position of crop so it can be reinserted in correct position
        numFaces = []# number of crops made in each photo

        for imageNum, detections in faces.items():
            image = images[imageNum][0]
            (h,w) = image.shape[:2]
            index=0# number of faces detected in image
            # loop over the detections
            for i in range(0, detections.shape[2]):
                # extract the confidence (i.e., probability) associated with the prediction
                conf = detections[0, 0, i, 2]
                # filter out weak detections by ensuring the `confidence` is greater than the minimum confidence
                if conf > 0.7:
                    # compute the (x, y)-coordinates of the bounding box for the object
                    box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                    (startX, startY, endX, endY) = box.astype("int")
                    if startX > image.shape[1]-10 or startY > image.shape[0]-10:
                        continue
                    w_box = endX - startX
                    h_box = endY - startY
                    transpose_x, transpose_y = w_box * 0.75, h_box * 0.75
                    x_img = math.floor(startX-transpose_x) if math.floor(startX-transpose_x) >= 0 else 0
                    y_img = math.floor(startY-transpose_y) if math.floor(startY-transpose_y) >= 0 else 0
                    w_img = math.floor(w_box+2*transpose_x) if x_img + math.floor(w_box+2*transpose_x) <= image.shape[1] else image.shape[1] - x_img
                    h_img = math.floor(h_box+2*transpose_y) if y_img + math.floor(h_box+2*transpose_y) <= image.shape[0] else image.shape[0] - y_img
                    X_positions.append([x_img, y_img, w_img, h_img])
                    # 2d array of cropped image
                    roi_color = image[y_img:h_img+y_img, x_img:w_img+x_img]
                    X.append(resize(roi_color, (IMG_HEIGHT, IMG_WIDTH), mode='constant', preserve_range=True))
                    index +=1
            if(index == 0):
                index = 1
                box = [0., 0., 1., 1.] * np.array([w, h, w, h])
                (startX, startY, endX, endY) = box.astype("int")
                w_box = endX - startX
                h_box = endY - startY
                transpose_x, transpose_y = w_box * 0.75, h_box * 0.75
                x_img = math.floor(startX-transpose_x) if math.floor(startX-transpose_x) >= 0 else 0
                y_img = math.floor(startY-transpose_y) if math.floor(startY-transpose_y) >= 0 else 0
                w_img = math.floor(w_box+2*transpose_x) if x_img + math.floor(w_box+2*transpose_x) <= image.shape[1] else image.shape[1] - x_img
                h_img = math.floor(h_box+2*transpose_y) if y_img + math.floor(h_box+2*transpose_y) <= image.shape[0] else image.shape[0] - y_img
                X_positions.append([x_img, y_img, w_img, h_img])
                # 2d array of cropped image
                roi_color = image[y_img:h_img+y_img, x_img:w_img+x_img]
                X.append(resize(roi_color, (IMG_HEIGHT, IMG_WIDTH), mode='constant', preserve_range=True))
            numFaces.append(index)

        X = np.array(X).astype(np.float32)
        preds_test = (model.predict(X, verbose=0) > 0.8).astype(np.uint8)
        index = 0
        masks = []
        for imageNum, detections in faces.items():
            upsampled_mask = np.zeros((images[imageNum][0].shape[0], images[imageNum][0].shape[1]), dtype=np.uint8)
            for i in range(index, index+numFaces[imageNum]):
                coords = X_positions[i]
                section = resize(np.squeeze(preds_test[i]), (coords[3], coords[2]), mode='constant', preserve_range=True, order=0)
                upsampled_mask[coords[1]:coords[3]+coords[1], coords[0]:coords[2]+coords[0]] += section.astype(np.uint8)
            masks.append(upsampled_mask)
            index += numFaces[imageNum]
            plt.imsave(os.path.abspath(os.path.join(filePath, '..', '..', '..', 'temp', 'maskImages', os.path.basename(file_names[imageNum]))), upsampled_mask, cmap=cm.gray)

        # np.set_printoptions(threshold=np.inf)
        # print(np.array2string(np.array(masks), separator=', '))

if __name__ == "__main__":
    main()
