/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { Live2DCubismFramework as csmvector } from '@framework/type/csmvector';
import Csm_csmVector = csmvector.csmVector;
import csmVector_iterator = csmvector.iterator;
import { gl } from './lappdelegate';

/**
 * 纹理管理类。
 *执行图像加载和管理的类。
 */
export class LAppTextureManager {
  /**
   * コンストラクタ
   */
  constructor() {
    this._textures = new Csm_csmVector<TextureInfo>();
  }

  /**
   * 解放する。
   */
  public release(): void {
    for (
      let ite: csmVector_iterator<TextureInfo> = this._textures.begin();
      ite.notEqual(this._textures.end());
      ite.preIncrement()
    ) {
      gl.deleteTexture(ite.ptr().id);
    }
    this._textures = null;
  }

  /**
   * 图像读入
   *
   * @param fileName 读取图像文件路径名
   * @param usePremultiply Premult処理を有効にするか 启用Premult处理或
   * @return 图像信息，读取失败时返回null
   */
  public createTextureFromPngFile(
    fileName: string,
    usePremultiply: boolean,
    callback: (textureInfo: TextureInfo) => void
  ): void {
    // search loaded texture already
    for (
      let ite: csmVector_iterator<TextureInfo> = this._textures.begin();
      ite.notEqual(this._textures.end());
      ite.preIncrement()
    ) {
      if (
        ite.ptr().fileName == fileName &&
        ite.ptr().usePremultply == usePremultiply
      ) {
        // 2回目以降はキャッシュが使用される(待ち時間なし)
        // WebKitでは同じImageのonloadを再度呼ぶには再インスタンスが必要
        // 詳細：https://stackoverflow.com/a/5024181
        ite.ptr().img = new Image();
        ite.ptr().img.onload = (): void => callback(ite.ptr());
        ite.ptr().img.src = fileName;
        return;
      }
    }

    // 触发数据加载
    const img = new Image();
    // jsdelivr会出现WebGL加载跨域纹理出错的问题
    img.crossOrigin = '';
    img.onload = (): void => {
      // 创建一个纹理对象
      const tex: WebGLTexture = gl.createTexture();

      // テクスチャを選択
      gl.bindTexture(gl.TEXTURE_2D, tex);

      // テクスチャにピクセルを書き込む
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      // Premult処理を行わせる
      if (usePremultiply) {
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
      }

      // テクスチャにピクセルを書き込む
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

      // ミップマップを生成
      gl.generateMipmap(gl.TEXTURE_2D);

      // テクスチャをバインド
      gl.bindTexture(gl.TEXTURE_2D, null);

      const textureInfo: TextureInfo = new TextureInfo();
      if (textureInfo != null) {
        textureInfo.fileName = fileName;
        textureInfo.width = img.width;
        textureInfo.height = img.height;
        textureInfo.id = tex;
        textureInfo.img = img;
        textureInfo.usePremultply = usePremultiply;
        this._textures.pushBack(textureInfo);
      }

      callback(textureInfo);
    };
    img.src = fileName;
  }

  /**
   * 画像の解放
   *
   * 配列に存在する画像全てを解放する。
   */
  public releaseTextures(): void {
    for (let i = 0; i < this._textures.getSize(); i++) {
      this._textures.set(i, null);
    }

    this._textures.clear();
  }

  /**
   * 画像の解放
   *
   * 指定したテクスチャの画像を解放する。
   * @param texture 解放するテクスチャ
   */
  public releaseTextureByTexture(texture: WebGLTexture): void {
    for (let i = 0; i < this._textures.getSize(); i++) {
      if (this._textures.at(i).id != texture) {
        continue;
      }

      this._textures.set(i, null);
      this._textures.remove(i);
      break;
    }
  }

  /**
   * 画像の解放
   *
   * 指定した名前の画像を解放する。
   * @param fileName 解放する画像ファイルパス名
   */
  public releaseTextureByFilePath(fileName: string): void {
    for (let i = 0; i < this._textures.getSize(); i++) {
      if (this._textures.at(i).fileName == fileName) {
        this._textures.set(i, null);
        this._textures.remove(i);
        break;
      }
    }
  }

  _textures: Csm_csmVector<TextureInfo>;
}

/**
 * 画像情報構造体
 */
export class TextureInfo {
  img: HTMLImageElement; // 画像
  id: WebGLTexture = null; //  纹理
  width = 0; // 宽度
  height = 0; // 高度
  usePremultply: boolean; // 启用Premult处理或
  fileName: string; // 文件名
}
